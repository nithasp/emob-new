import { Provider } from '@angular/core';
import { ResultMapService } from './result-map.service';
import { ResultPlanService } from './result-plan.service';

// Provided by the page instead of the root, so every result page starts from an empty plan and map.
export const RESULT_PAGE_PROVIDERS: Provider[] = [ResultPlanService, ResultMapService];
