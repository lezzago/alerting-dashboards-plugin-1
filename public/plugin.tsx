/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { PLUGIN_NAME } from '../utils/constants';
import { Plugin, CoreStart, CoreSetup } from '../../../src/core/public';
import { createAlertingAction, ACTION_ALERTING } from './actions/alerting_dashboard_action';
import { CONTEXT_MENU_TRIGGER } from '../../../src/plugins/embeddable/public';
import { IEmbeddable } from '../../../src/plugins/dashboard/public/embeddable_plugin';
import { createSavedFeatureAnywhereLoader } from '../../../src/plugins/visualizations/public';
import {
  setSearchService,
  setClient,
  setSavedFeatureAnywhereLoader,
} from './services';
import { overlayAlertsFunction } from './expressions';
import { UiActionsSetup } from '../../../src/plugins/ui_actions/public';

declare module '../../../src/plugins/ui_actions/public' {
  export interface ActionContextMapping {
    [ACTION_ALERTING]: {};
  }
}

export interface AlertingOpenSearchDashboardsPluginSetup {}
export interface AlertingOpenSearchDashboardsPluginStart {}

export interface AlertingOpenSearchDashboardsPluginSetupDeps {
  expressions: ExpressionsSetup;
  data: DataPublicPluginSetup;
  uiActions: UiActionsSetup;
}

// TODO: may not need expressions. See comment above start().
export interface AlertingOpenSearchDashboardsPluginStartDeps {
  expressions: ExpressionsStart;
  data: DataPublicPluginStart;
  uiActions: UiActionsSetup;
}

export class AlertingPlugin implements Plugin<
  AlertingOpenSearchDashboardsPluginSetup,
  AlertingOpenSearchDashboardsPluginStart,
  AlertingOpenSearchDashboardsPluginSetupDeps,
  AlertingOpenSearchDashboardsPluginStartDeps
  > {
  public setup(
    core: CoreSetup<
      AlertingOpenSearchDashboardsPluginStartDeps,
      AlertingOpenSearchDashboardsPluginStart
      >,
    { expressions, data, uiActions }: AlertingOpenSearchDashboardsPluginSetupDeps
  ): AlertingOpenSearchDashboardsPluginSetup {

    // Set the HTTP client so it can be pulled into expression fns to make
    // direct server-side calls
    setClient(core.http);

    core.application.register({
      id: PLUGIN_NAME,
      title: 'Alerting',
      description: 'OpenSearch Dashboards Alerting Plugin',
      category: {
        id: 'opensearch',
        label: 'OpenSearch Plugins',
        order: 2000,
      },
      order: 4000,
      mount: async (params) => {
        const { renderApp } = await import('./app');
        const [coreStart] = await core.getStartServices();
        return renderApp(coreStart, params);
      },
    });

    // Register the expression fn to overlay anomalies on a given datatable
    expressions.registerFunction(overlayAlertsFunction);

    const alertingAction = createAlertingAction();
    // const { uiActions } = plugins;
    uiActions.addTriggerAction(CONTEXT_MENU_TRIGGER, alertingAction);

    return {};
  }

  public start(
    core: CoreStart,
    { expressions, data, uiActions }: AlertingOpenSearchDashboardsPluginStartDeps
  ): AlertingOpenSearchDashboardsPluginStart {
    // TODO: as of now, we aren't using this search service. Keep for now in case
    // it will be needed later (to construct SearchSources, for example).
    setSearchService(data.search);

    // Generate the feature anywhere loader
    // TODO: this may be imported from somewhere other than visualizations later on
    const savedFeatureAnywhereLoader = createSavedFeatureAnywhereLoader({
      savedObjectsClient: core.savedObjects.client,
      indexPatterns: data.indexPatterns,
      search: data.search,
      chrome: core.chrome,
      overlays: core.overlays,
    });
    setSavedFeatureAnywhereLoader(savedFeatureAnywhereLoader);

    return {};
  }

  public stop() {}
}
