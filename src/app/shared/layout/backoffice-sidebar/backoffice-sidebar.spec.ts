import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BackofficeSidebar } from './backoffice-sidebar';

describe('BackofficeSidebar', () => {
  let component: BackofficeSidebar;
  let fixture: ComponentFixture<BackofficeSidebar>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BackofficeSidebar]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BackofficeSidebar);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
