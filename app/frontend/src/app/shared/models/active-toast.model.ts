import { ComponentRef } from "@angular/core";
import { ToastRef } from "ngx-toastr";
import { Observable } from "rxjs";

export interface ActiveToast<C = unknown> {
    toastId: number;
    title: string;
    message: string;
    portal: ComponentRef<C>;
    toastRef: ToastRef<C>;
    onShown: Observable<void>;
    onHidden: Observable<void>;
    onTap: Observable<void>;
    onAction: Observable<unknown>;
  }
