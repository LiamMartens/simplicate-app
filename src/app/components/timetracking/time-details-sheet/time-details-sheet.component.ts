import {Component, Inject, OnDestroy} from '@angular/core';
import {MAT_BOTTOM_SHEET_DATA, MatBottomSheetRef} from '@angular/material';
import {FormBuilder, FormGroup, Validators} from '@angular/forms';
import {SimplicateService} from '../../../providers/simplicate.service';
import {Subscription} from 'rxjs';
import {HourModel} from '../../../domain/hour.model';
import {TrackingServiceService} from '../../../providers/tracking-service.service';

@Component({
  selector: 'app-time-details-sheet',
  templateUrl: './time-details-sheet.component.html',
  styleUrls: ['./time-details-sheet.component.scss']
})
export class TimeDetailsSheetComponent implements OnDestroy {
  timeForm: FormGroup;

  projectId: string;
  projectserviceId: string;
  startDate: Date;

  const;
  subs: Array<Subscription> = [];

  constructor(
    private bottomSheetRef: MatBottomSheetRef<TimeDetailsSheetComponent>,
    @Inject(MAT_BOTTOM_SHEET_DATA) public data: { hour: HourModel, isTimer: boolean },
    public fb: FormBuilder,
    private tracking: TrackingServiceService,
    private simplicateService: SimplicateService
  ) {
    this.initForm(data.hour);
  }

  get isActiveTimer() {
    const activeTimer = this.simplicateService.getActiveTimer();

    return this.data.isTimer && activeTimer && this.data.hour.id === activeTimer;
  }

  initForm(data: HourModel) {
    this.timeForm = this.fb.group({
      projectservice: [data.projectservice.id],
      project: [data.project.id, Validators.required],
      type: [data.type.id, Validators.required],
      startTime: [data.start_date, Validators.required],
      endTime: [data.end_date, Validators.required],
      note: [data.note]
    });

    this.projectId = data.project.id;
    this.projectserviceId = data.projectservice.id;
    this.startDate = data.start_date;

    this.subs.push(
      this.timeForm.controls['project'].valueChanges.subscribe(id => {
        this.projectId = id;
      }),

      this.timeForm.controls['projectservice'].valueChanges.subscribe(id => {
        this.projectserviceId = id;
      })
    );
  }

  ngOnDestroy() {
    this.subs.forEach(sub => sub.unsubscribe());
  }

  close(event: MouseEvent): void {
    this.bottomSheetRef.dismiss();
    event.preventDefault();
  }

  delete() {

    this.tracking.trackEvent('timetable', 'delete-hour');

    this.simplicateService.deleteEmployeeHours(this.data.hour.id).subscribe(() => {
      this.bottomSheetRef.dismiss();
    });
  }

  onSubmit(reInit = false) {
    const {projectservice, project, type, startTime, endTime, note} = this.timeForm.value;
    const payload = HourModel.fromJSON(this.data.hour);
    let action;

    payload.start_date = startTime;
    payload.end_date = endTime;
    payload.note = note;
    payload.project.id = project;
    payload.projectservice.id = projectservice;
    payload.type.id = type;

    if (this.data.isTimer) {
      this.tracking.trackEvent('timetable', 'create-timer-item');
      action = this.simplicateService.setActiveTimer(payload);
    } else if (this.data.hour.id) {
      this.tracking.trackEvent('timetable', 'update-item');
      action = this.simplicateService.updateEmployeeHours(payload);
    } else {
      this.tracking.trackEvent('timetable', 'create-item');
      action = this.simplicateService.addNewEmployeeHours(payload);
    }

    action.subscribe(() => {
      if (reInit) {
        const data = HourModel.fromJSON(payload);
        data.start_date = payload.end_date;
        data.end_date = new Date(data.start_date.getTime() + (30 * 60 * 1000));
        this.initForm(data);
      } else {
        this.bottomSheetRef.dismiss();
      }
    });
  }

  onTimerStop() {
    this.simplicateService.clearTimer();
    this.bottomSheetRef.dismiss();
    this.tracking.trackEvent('timetable', 'stop-timer');
  }
}
