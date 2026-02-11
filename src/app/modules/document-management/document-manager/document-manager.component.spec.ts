import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DManagerComponent } from './document-manager.component';

describe('WordEditorComponent', () => {
  let component: DManagerComponent;
  let fixture: ComponentFixture<DManagerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DManagerComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DManagerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
