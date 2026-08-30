import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BackofficeShell } from './backoffice-shell';

describe('BackofficeShell', () => {
  let component: BackofficeShell;
  let fixture: ComponentFixture<BackofficeShell>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BackofficeShell]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BackofficeShell);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
