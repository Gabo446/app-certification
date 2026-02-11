import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WordEditorComponent } from './word-editor.component';

describe('WordEditorComponent', () => {
  let component: WordEditorComponent;
  let fixture: ComponentFixture<WordEditorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WordEditorComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(WordEditorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
