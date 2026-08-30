import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BackofficeHeader } from './backoffice-header';

describe('BackofficeHeader', () => {
  let component: BackofficeHeader;
  let fixture: ComponentFixture<BackofficeHeader>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BackofficeHeader]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BackofficeHeader);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
