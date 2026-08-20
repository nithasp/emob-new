import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnInit,
  Output,
  SimpleChanges, inject,
} from '@angular/core';
import { NgbActiveModal, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import {
  IconStyle,
  Location,
  LocationType,
} from 'src/app/models/location.model';
import {
  Customer,
  DetailsPreOrder,
  ReplaceType,
  ValidationType,
  getDescription,
  PreOrder,
  ProductDetail,
} from 'src/app/models/pre-order.model';
import { DataPreOrder } from 'src/app/models/pre-order.model';
import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import {
  defaults as defaultControls,
  ZoomSlider,
  FullScreen,
  Attribution,
} from 'ol/control';
import * as OlProj from 'ol/proj';
import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';
import Icon from 'ol/style/Icon';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import OSM from 'ol/source/OSM';
import { Style } from 'ol/style';
import { MarkLocationDialogComponent } from '../mark-location-dialog/mark-location-dialog.component';
import { ToastrService } from 'ngx-toastr';
import { TranslocoService } from '@jsverse/transloco';
import { SnakeCasePipe } from 'src/app/directives/snakecase.pipe.directive';
import { set } from 'ol/transform';
import { LoggerService } from 'src/app/services/logger.service';

@Component({
  selector: 'app-customer-details',
  templateUrl: './customer-details.component.html',
  styleUrl: './customer-details.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CustomerDetailsComponent
  implements OnInit, AfterViewInit, OnChanges
{
  private readonly logger = inject(LoggerService);

  @Input() dataPreOrder: DetailsPreOrder | DataPreOrder | null | undefined;
  @Input() dataCustomer!: Customer;
  @Input() locationType: LocationType = LocationType.Verify;
  @Input() isModal: boolean = true;
  @Input() isGeolocationDisplay: boolean = true;
  @Output() dataEmitter: EventEmitter<Location> = new EventEmitter<Location>();
  location: Location = {
    latitude: 0,
    longitude: 0,
  };

  page = 1;

  // Map
  public map!: Map;
  public iconStyle: Partial<IconStyle> = {};
  public vectorSource!: VectorSource;
  public vectorLayer!: VectorLayer;
  private isFirstChange: boolean = true;

  constructor(
    private readonly ngbModal: NgbModal,
    private readonly ngbModalActive: NgbActiveModal,
    private readonly toastr: ToastrService,
    private readonly transloco: TranslocoService
  ) {}

  ngOnInit(): void {
    if (this.isModal) {
      this.logger.log('Component is used as a modal');
    } else {
      this.logger.log('Component is used via selector in HTML');
    }
    this.location.latitude = Number(this.dataCustomer?.latitude || 0);
    this.location.longitude = Number(this.dataCustomer?.longitude || 0);
    
    this.vectorSource = new VectorSource({});
    this.vectorLayer = new VectorLayer({
      source: this.vectorSource,

      updateWhileInteracting: true,
      updateWhileAnimating: true,
    });
    this.initIconStyle();

    this.logger.log('this.dataCustomer', this.dataCustomer);
    this.logger.log('this.dataPreOrder', this.dataPreOrder);
  }

  ngAfterViewInit(): void {
    this.initMap();
    this.setLocation(this.dataCustomer, this.location);
  }

  ngOnDestroy(): void {
    this.isGeolocationDisplay = true;
  }

  ngOnChanges(changes: SimpleChanges) {
    this.logger.log('Onchange', changes);
    if (!this.isFirstChange) {
      if (
        changes['dataCustomer'].currentValue['name'] !=
        changes['dataCustomer'].previousValue['name']
      ) {
        this.logger.log('have change', this.locationType);
        // Detect changes to the @Input property
        this.refreshLocation();
      }
    } else {
      this.logger.log('ngOnChanges called for the first time');
      this.isFirstChange = false;
    }
  }

  refreshLocation() {
    // Logic to refresh the component
    this.location.latitude = Number(this.dataCustomer.latitude);
    this.location.longitude = Number(this.dataCustomer.longitude);
    this.setLocation(this.dataCustomer, this.location);
  }

  private initMap() {
    const attribution = new Attribution({
      collapsible: true,
    });
    this.map = new Map({
      layers: [
        new TileLayer({
          source: new OSM({
            attributions:
              '&copy;<a href="https://www.openstreetmap.org/copyright"> OpenStreetMap contributors</a>',
            crossOrigin: 'anonymous',
            cacheSize: 10000,
            maxZoom: 20,
          }),
        }),
        this.vectorLayer,
      ],
      target: 'customerProfileMap',
      view: new View({
        center: OlProj.transform(
          [100.53139488523458, 13.786463255129673],
          'EPSG:4326',
          'EPSG:3857'
        ),
        zoom: 10,
        maxZoom: 20,
        minZoom: 0,
      }),
      controls: defaultControls({ attribution: false }).extend([
        new ZoomSlider(),
        new FullScreen(),
        attribution,
      ]),
    });
  }

  private setLocation(customer: Customer, latlong: Location) {
    this.vectorSource.clear();
    const location: Feature = new Feature({
      geometry: new Point(
        OlProj.fromLonLat([Number(latlong.longitude), Number(latlong.latitude)])
      ),
      data: customer.name,
    });

    this.logger.log('locationTpye before checking and use icon', this.locationType);
    if (this.locationType === LocationType.Edit && this.isModal) {
      location.setStyle(this.iconStyle.edit);
      this.locationType = LocationType.Edit;
    } else if (
      (customer.replaceType === ReplaceType.NO_REPLACE ||
        customer.replaceType === ReplaceType.INPUT) &&
      (customer.validationType === ValidationType.SUBDISTRICT_LEVEL ||
        customer.validationType === ValidationType.DISTRICT_LEVEL)
    ) {
      location.setStyle(this.iconStyle.verify);
      this.locationType = LocationType.Verify;
    } else if (
      customer.replaceType === ReplaceType.SUBDISTRICT_LEVEL ||
      customer.replaceType === ReplaceType.DISTRICT_LEVEL
    ) {
      location.setStyle(this.iconStyle.uncertain);
      this.locationType = LocationType.Uncertain;
    } else if (
      customer.replaceType === ReplaceType.PROVINCE_LEVEL ||
      customer.validationType === ValidationType.NO_VALID ||
      customer.validationType === ValidationType.NAN_INPUT ||
      customer.validationType === ValidationType.NON_VALIDATED
    ) {
      location.setStyle(this.iconStyle.unverify);
      this.locationType = LocationType.Unverify;
    } else {
      location.setStyle(
        new Style({
          image: new Icon({
            anchor: [0.5, 0.5],
            anchorOrigin: 'bottom-left',
            anchorXUnits: 'fraction',
            anchorYUnits: 'pixels',
            crossOrigin: 'anonymous',
            opacity: 0.8,
            src: `assets/image/position.png`
          }),
        })
      );
    }

    this.vectorSource.addFeature(location);
    this.map
      .getView()
      .setCenter(
        OlProj.fromLonLat([Number(latlong.longitude), Number(latlong.latitude)])
      );
    this.map.getView().setZoom(18);
  }

  private initIconStyle() {
    Object.values(LocationType).forEach((type) => {
      let iconLocation = new Style({
        image: new Icon({
          anchor: [0.5, 0.5],
          anchorOrigin: 'bottom-left',
          anchorXUnits: 'fraction',
          anchorYUnits: 'pixels',
          crossOrigin: 'anonymous',
          opacity: 0.8,
          src: `assets/image/${type}.png`,
        }),
      });

      if (type === LocationType.Verify) {
        this.iconStyle.verify = iconLocation;
      } else if (type === LocationType.Uncertain) {
        this.iconStyle.uncertain = iconLocation;
      } else if (type === LocationType.Unverify) {
        this.iconStyle.unverify = iconLocation;
      } else if (type === LocationType.Edit) {
        this.iconStyle.edit = iconLocation;
      }
    });
  }
  // Provide a unified iterable type for template to avoid NG2 union errors
  get detailRows(): Array<ProductDetail | PreOrder> {
    const details = (this.dataPreOrder as DetailsPreOrder | DataPreOrder)?.details || [];
    return details as Array<ProductDetail | PreOrder>;
  }
  convertDateString(dateString: string): Date {
    const parts = dateString.split(/[\s/:]/);
    return new Date(+parts[2], +parts[1] - 1, +parts[0], +parts[3], +parts[4]);
  }

  close() {
    this.ngbModalActive.close(this.location);
  }

  getEnumDescription(enumValue: ReplaceType | ValidationType): string {
    return getDescription(enumValue);
  }

  isVerified(): boolean {
    return this.locationType === LocationType.Verify;
  }

  isUncertain(): boolean {
    return this.locationType === LocationType.Uncertain;
  }

  isUnverified(): boolean {
    return this.locationType === LocationType.Unverify;
  }
  isEdited(): boolean {
    return this.locationType === LocationType.Edit;
  }

  markLocation() {
    const focusedElement = document.activeElement as HTMLElement;
    if (focusedElement) {
      focusedElement.blur();
    }
    const dialogRef = this.ngbModal.open(MarkLocationDialogComponent, {
      centered: true,
      windowClass: 'custom-modal-align-right',
      backdrop: 'static',
      keyboard: false,
      size: 'lg',
      animation: true,
      beforeDismiss: () => {
        return false;
      },
    });
    dialogRef.componentInstance.location = {
      longitude: this.dataCustomer.longitude,
      latitude: this.dataCustomer.latitude,
    };
    dialogRef.componentInstance.address =
      this.dataCustomer.originalAddress?.address ?? '';

    dialogRef.result
      .then((result: Location) => {
        if (result) {
          this.logger.log(result);
          this.location.latitude = Number(result.latitude);
          this.location.longitude = Number(result.longitude);
          this.locationType = LocationType.Edit;
          this.dataEmitter.emit(this.location);
          this.setLocation(this.dataCustomer, this.location);
          this.toastr.success(
            this.transloco.translate('update_location', {}, 'index'),
            'Succeed'
          );
        }
      })
      .catch((error) => {
        this.logger.error('Dialog was dismissed:', error);
      });
  }
}
