/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { EuiHorizontalRule, EuiSpacer } from '@elastic/eui';
import ContentPanel from '../../../../components/ContentPanel';
import _ from 'lodash';
import DefineBucketLevelTrigger from '../DefineBucketLevelTrigger';
import AddTriggerButton from '../../components/AddTriggerButton';
import TriggerEmptyPrompt from '../../components/TriggerEmptyPrompt';
import { MAX_TRIGGERS } from '../../../MonitorDetails/containers/Triggers/Triggers';
import DefineTrigger from '../DefineTrigger';
import { MONITOR_TYPE, SEARCH_TYPE } from '../../../../utils/constants';
import { getPathsPerDataType } from '../../../CreateMonitor/containers/DefineMonitor/utils/mappings';
import monitorToFormik from '../../../CreateMonitor/containers/CreateMonitor/utils/monitorToFormik';
import { buildRequest } from '../../../CreateMonitor/containers/DefineMonitor/utils/searchRequests';
import { backendErrorNotification, inputLimitText } from '../../../../utils/helpers';
import moment from 'moment';
import { formikToTrigger } from '../CreateTrigger/utils/formikToTrigger';
import DefineDocumentLevelTrigger from '../DefineDocumentLevelTrigger/DefineDocumentLevelTrigger';
import {
  buildClusterMetricsRequest,
  canExecuteClusterMetricsMonitor,
  getDefaultScript,
} from '../../../CreateMonitor/components/ClusterMetricsMonitor/utils/clusterMetricsMonitorHelpers';
import { FORMIK_INITIAL_VALUES } from '../../../CreateMonitor/containers/CreateMonitor/utils/constants';

class ConfigureTriggers extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      dataTypes: {},
      executeResponse: null,
      isBucketLevelMonitor:
        _.get(props, 'monitor.monitor_type', MONITOR_TYPE.QUERY_LEVEL) ===
        MONITOR_TYPE.BUCKET_LEVEL,
      triggerDeleted: false,
      addTriggerButton: this.prepareAddTriggerButton(),
      triggerEmptyPrompt: this.prepareTriggerEmptyPrompt(),
    };

    this.onQueryMappings = this.onQueryMappings.bind(this);
    this.onRunExecute = this.onRunExecute.bind(this);
    this.prepareAddTriggerButton = this.prepareAddTriggerButton.bind(this);
    this.prepareTriggerEmptyPrompt = this.prepareTriggerEmptyPrompt.bind(this);
  }

  componentDidMount() {
    const {
      monitorValues: { searchType, uri },
    } = this.props;
    const { isBucketLevelMonitor } = this.state;
    if (searchType === SEARCH_TYPE.CLUSTER_METRICS && canExecuteClusterMetricsMonitor(uri))
      this.onRunExecute();
    if (isBucketLevelMonitor) this.onQueryMappings();
  }

  componentDidUpdate(prevProps) {
    const prevMonitorType = _.get(prevProps, 'monitor.monitor_type', MONITOR_TYPE.QUERY_LEVEL);
    const currMonitorType = _.get(this.props, 'monitor.monitor_type', MONITOR_TYPE.QUERY_LEVEL);
    if (prevMonitorType !== currMonitorType)
      _.set(this.state, 'isBucketLevelMonitor', currMonitorType === MONITOR_TYPE.BUCKET_LEVEL);

    const prevSearchType = _.get(
      prevProps,
      'monitorValues.searchType',
      FORMIK_INITIAL_VALUES.searchType
    );
    const currSearchType = _.get(
      this.props,
      'monitorValues.searchType',
      FORMIK_INITIAL_VALUES.searchType
    );
    const prevApiType = _.get(
      prevProps,
      'monitorValues.uri.api_type',
      FORMIK_INITIAL_VALUES.uri.api_type
    );
    const currApiType = _.get(
      this.props,
      'monitorValues.uri.api_type',
      FORMIK_INITIAL_VALUES.uri.api_type
    );
    if (prevSearchType !== currSearchType || prevApiType !== currApiType) {
      switch (currSearchType) {
        case SEARCH_TYPE.CLUSTER_METRICS:
          _.set(this.state, 'addTriggerButton', this.prepareAddTriggerButton());
          _.set(this.state, 'triggerEmptyPrompt', this.prepareTriggerEmptyPrompt());
          break;
      }
    }

    const prevInputs = prevProps.monitor.inputs[0];
    const currInputs = this.props.monitor.inputs[0];
    if (!_.isEqual(prevInputs, currInputs)) {
      const { isBucketLevelMonitor } = this.state;
      if (isBucketLevelMonitor) this.onQueryMappings();
    }
  }

  prepareAddTriggerButton = () => {
    const { monitorValues, triggerArrayHelpers, triggerValues } = this.props;
    const disableAddTriggerButton =
      _.get(triggerValues, 'triggerDefinitions', []).length >= MAX_TRIGGERS;
    return (
      <AddTriggerButton
        arrayHelpers={triggerArrayHelpers}
        disabled={disableAddTriggerButton}
        script={getDefaultScript(monitorValues)}
      />
    );
  };

  prepareTriggerEmptyPrompt = () => {
    const { monitorValues, triggerArrayHelpers } = this.props;
    return (
      <TriggerEmptyPrompt
        arrayHelpers={triggerArrayHelpers}
        script={getDefaultScript(monitorValues)}
      />
    );
  };

  onRunExecute = (triggers = []) => {
    const { httpClient, monitor, notifications } = this.props;
    const formikValues = monitorToFormik(monitor);
    const searchType = formikValues.searchType;
    const monitorToExecute = _.cloneDeep(monitor);
    _.set(monitorToExecute, 'triggers', triggers);

    switch (searchType) {
      case SEARCH_TYPE.QUERY:
      case SEARCH_TYPE.GRAPH:
        const searchRequest = buildRequest(formikValues);
        _.set(monitorToExecute, 'inputs[0].search', searchRequest);
        break;
      case SEARCH_TYPE.CLUSTER_METRICS:
        const clusterMetricsRequest = buildClusterMetricsRequest(formikValues);
        _.set(monitorToExecute, 'inputs[0].uri', clusterMetricsRequest);
        break;
      default:
        console.log(`Unsupported searchType found: ${JSON.stringify(searchType)}`, searchType);
    }

    httpClient
      .post('../api/alerting/monitors/_execute', { body: JSON.stringify(monitorToExecute) })
      .then((resp) => {
        if (resp.ok) {
          this.setState({ executeResponse: resp.resp });
        } else {
          // TODO: need a notification system to show errors or banners at top
          console.error('err:', resp);
          backendErrorNotification(notifications, 'run', 'trigger', resp.resp);
        }
      })
      .catch((err) => {
        console.log('err:', err);
      });
  };

  async queryMappings(index) {
    if (!index.length) {
      return {};
    }

    try {
      const response = await this.props.httpClient.post('../api/alerting/_mappings', {
        body: JSON.stringify({ index }),
      });
      if (response.ok) {
        return response.resp;
      }
      return {};
    } catch (err) {
      throw err;
    }
  }

  async onQueryMappings() {
    const indices = this.props.monitor.inputs[0].search.indices;
    try {
      const mappings = await this.queryMappings(indices);
      const dataTypes = getPathsPerDataType(mappings);
      this.setState({ dataTypes });
    } catch (err) {
      console.error('There was an error getting mappings for query', err);
    }
  }

  getTriggerContext = (executeResponse, monitor, values) => {
    return {
      periodStart: moment.utc(_.get(executeResponse, 'period_start', Date.now())).format(),
      periodEnd: moment.utc(_.get(executeResponse, 'period_end', Date.now())).format(),
      results: [_.get(executeResponse, 'input_results.results[0]')].filter((result) => !!result),
      trigger: formikToTrigger(values, _.get(this.props.monitor, 'ui_metadata', {})),
      alert: null,
      error: null,
      monitor: monitor,
    };
  };

  renderDefineTrigger = (triggerArrayHelpers, index) => {
    const {
      edit,
      monitor,
      monitorValues,
      notifications,
      setFlyout,
      triggers,
      triggerValues,
      isDarkMode,
      httpClient,
      notificationService,
      plugins,
    } = this.props;

    const { executeResponse } = this.state;
    return (
      <DefineTrigger
        edit={edit}
        triggerArrayHelpers={triggerArrayHelpers}
        context={this.getTriggerContext(executeResponse, monitor, triggerValues)}
        executeResponse={executeResponse}
        monitor={monitor}
        monitorValues={monitorValues}
        onRun={this.onRunExecute}
        setFlyout={setFlyout}
        triggers={triggers}
        triggerValues={triggerValues}
        isDarkMode={isDarkMode}
        triggerIndex={index}
        httpClient={httpClient}
        notifications={notifications}
        notificationService={notificationService}
        plugins={plugins}
      />
    );
  };

  renderDefineBucketLevelTrigger = (triggerArrayHelpers, index) => {
    const {
      edit,
      monitor,
      monitorValues,
      setFlyout,
      triggers,
      triggerValues,
      isDarkMode,
      httpClient,
      notifications,
      notificationService,
      plugins,
    } = this.props;
    const { dataTypes, executeResponse } = this.state;
    return (
      <DefineBucketLevelTrigger
        edit={edit}
        triggerArrayHelpers={triggerArrayHelpers}
        context={this.getTriggerContext(executeResponse, monitor, triggerValues)}
        executeResponse={executeResponse}
        monitor={monitor}
        monitorValues={monitorValues}
        onRun={this.onRunExecute}
        setFlyout={setFlyout}
        triggers={triggers}
        triggerValues={triggerValues}
        isDarkMode={isDarkMode}
        dataTypes={dataTypes}
        triggerIndex={index}
        httpClient={httpClient}
        notifications={notifications}
        notificationService={notificationService}
        plugins={plugins}
      />
    );
  };

  renderDefineDocumentLevelTrigger = (triggerArrayHelpers, index) => {
    const {
      edit,
      monitor,
      monitorValues,
      setFlyout,
      triggers,
      triggerValues,
      isDarkMode,
      httpClient,
      notifications,
      notificationService,
      plugins,
    } = this.props;
    const { dataTypes, executeResponse } = this.state;
    return (
      <DefineDocumentLevelTrigger
        edit={edit}
        triggerArrayHelpers={triggerArrayHelpers}
        context={this.getTriggerContext(executeResponse, monitor, triggerValues)}
        executeResponse={executeResponse}
        monitor={monitor}
        monitorValues={monitorValues}
        onRun={this.onRunExecute}
        setFlyout={setFlyout}
        triggers={triggers}
        triggerValues={triggerValues}
        isDarkMode={isDarkMode}
        dataTypes={dataTypes}
        triggerIndex={index}
        httpClient={httpClient}
        notifications={notifications}
        notificationService={notificationService}
        plugins={plugins}
      />
    );
  };

  renderTriggers = (triggerArrayHelpers) => {
    const { monitorValues, triggerValues } = this.props;
    const hasTriggers = !_.isEmpty(_.get(triggerValues, 'triggerDefinitions'));

    const triggerContent = (arrayHelpers, index) => {
      switch (monitorValues.monitor_type) {
        case MONITOR_TYPE.BUCKET_LEVEL:
          return this.renderDefineBucketLevelTrigger(arrayHelpers, index);
        case MONITOR_TYPE.DOC_LEVEL:
          return this.renderDefineDocumentLevelTrigger(arrayHelpers, index);
        default:
          return this.renderDefineTrigger(arrayHelpers, index);
      }
    };

    return hasTriggers ? (
      triggerValues.triggerDefinitions.map((trigger, index) => {
        return (
          <div key={index}>
            {triggerContent(triggerArrayHelpers, index)}
            <EuiHorizontalRule margin={'s'} />
          </div>
        );
      })
    ) : (
      <TriggerEmptyPrompt arrayHelpers={triggerArrayHelpers} />
    );
  };

  render() {
    const { triggerArrayHelpers, triggerValues } = this.props;
    const { addTriggerButton } = this.state;
    const numOfTriggers = _.get(triggerValues, 'triggerDefinitions', []).length;
    const displayAddTriggerButton = numOfTriggers > 0;
    return (
      <ContentPanel
        title={`Triggers (${numOfTriggers})`}
        titleSize={'s'}
        panelStyles={{ paddingBottom: '0px', paddingLeft: '20px', paddingRight: '20px' }}
        bodyStyles={{ paddingLeft: '0px', padding: '10px' }}
        horizontalRuleClassName={'accordion-horizontal-rule'}
      >
        {this.renderTriggers(triggerArrayHelpers)}

        {displayAddTriggerButton ? (
          <div style={{ paddingBottom: '20px', paddingTop: '15px' }}>
            {addTriggerButton}
            <EuiSpacer size={'s'} />
            {inputLimitText(numOfTriggers, MAX_TRIGGERS, 'trigger', 'triggers')}
          </div>
        ) : null}
      </ContentPanel>
    );
  }
}

export default ConfigureTriggers;
