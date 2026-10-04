import { ComponentRef } from "@angular/core";
import { ToastRef } from "ngx-toastr";
import { Observable } from "rxjs";

/** Mirrors ngx-toastr's own `ActiveToast<C>`; `C` is the toast component type. */
export interface ActiveToast<C = unknown> {
    /** Your Toast ID. Use this to close it individually */
    toastId: number;
    /** the title of your toast. Stored to prevent duplicates if includeTitleDuplicates set */
    title: string;
    /** the message of your toast. Stored to prevent duplicates */
    message: string;
    /** a reference to the component see portal.ts */
    portal: ComponentRef<C>;
    /** a reference to your toast */
    toastRef: ToastRef<C>;
    /** triggered when toast is active */
    onShown: Observable<void>;
    /** triggered when toast is destroyed */
    onHidden: Observable<void>;
    /** triggered on toast click */
    onTap: Observable<void>;
    /** available for your use in custom toast */
    onAction: Observable<unknown>;
  }
