import { Injectable } from '@angular/core';
import { EMPTY, Observable } from 'rxjs';
import { ApiService } from '../../core/api.service';
import { switchMap } from 'rxjs/operators';
import { HttpParams } from '@angular/common/http';

interface PresignedUrlResponse {
  url: string;
  key: string;
  expiresIn: number;
}

@Injectable()
export class ManageProductsService extends ApiService {
  uploadProductsCSV(file: File): Observable<unknown> {
    if (!this.endpointEnabled('import')) {
      console.warn(
        'Endpoint "import" is disabled. To enable change your environment.ts config',
      );
      return EMPTY;
    }

    return this.getPreSignedUrl(file.name).pipe(
      switchMap((resp) => {
        return this.http.put(resp.url, file, {
          headers: {
            // eslint-disable-next-line @typescript-eslint/naming-convention
            'Content-Type': 'text/csv',
          },
          withCredentials: false,
        });
      }),
    );
  }

  private getPreSignedUrl(fileName: string): Observable<PresignedUrlResponse> {
    const url = this.getUrl('import', 'import');
    const params = new HttpParams().set('name', fileName);
    return this.http.get<PresignedUrlResponse>(url, {
      params,
    });
  }
}
