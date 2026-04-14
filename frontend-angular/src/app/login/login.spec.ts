import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LoginLoginComponent } from './login';

describe('LoginLoginComponent', () => {
  let component: LoginLoginComponent;
  let fixture: ComponentFixture<LoginLoginComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoginLoginComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(LoginLoginComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
