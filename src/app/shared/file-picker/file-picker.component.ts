import { Component, model, OnInit, output } from '@angular/core';
import { MatButton } from '@angular/material/button';

@Component({
  selector: 'app-file-picker',
  templateUrl: './file-picker.component.html',
  styleUrls: ['./file-picker.component.scss'],
  standalone: true,
  imports: [MatButton],
})
export class FilePickerComponent implements OnInit {
  uploadClick = output();

  file = model<File>();
  ngOnInit(): void {
    this.file.set({ name: 'productManufacturing' } as File);
  }

  selectFile(files: FileList | null): void {
    if (!files?.length) {
      this.removeFile();
      return;
    }

    const file = files.item(0) as File;

    if (!['text/csv', 'application/vnd.ms-excel'].includes(file.type)) {
      this.removeFile();
      return;
    }

    this.file.set(file);
  }

  removeFile(): void {
    this.file.set(undefined);
  }
}
