/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  EuiFlexItem,
  EuiFlexGroup,
  EuiFlyoutHeader,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiTitle,
  EuiSpacer,
  EuiButton,
  EuiButtonEmpty,
  EuiFormFieldset,
  EuiCheckableCard,
} from '@elastic/eui';
import './styles.scss';
import CreateNew from './CreateNew';
import AssociateExisting from './AssociateExisting';

function AddAlertingMonitor({
  embeddable,
  closeFlyout,
  core,
  services,
  mode,
  setMode,
  monitors,
  selectedMonitorId,
  setSelectedMonitorId,
  index,
}) {
  const onCreate = () => {
    console.log(`Current mode: ${mode}`);
    const event = new Event('createMonitor');
    document.dispatchEvent(event);
    closeFlyout();
  };

  return (
    <div className="add-alerting-monitor">
      <EuiFlyoutHeader hasBorder>
        <EuiTitle>
          <h2 id="add-alerting-monitor__title">Add alerting monitor</h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <div className="add-alerting-monitor__scroll">
          <EuiFormFieldset
            legend={{
              display: 'hidden',
              children: (
                <EuiTitle>
                  <span>Options to create a new monitor or associate an existing monitor</span>
                </EuiTitle>
              ),
            }}
            className="add-alerting-monitor__modes"
          >
            {[
              {
                id: 'add-alerting-monitor__create',
                label: 'Create new monitor',
                value: 'create',
              },
              {
                id: 'add-alerting-monitor__existing',
                label: 'Associate existing monitor',
                value: 'existing',
              },
            ].map((option) => (
              <EuiCheckableCard
                {...{
                  ...option,
                  key: option.id,
                  name: option.id,
                  checked: option.value === mode,
                  onChange: () => setMode(option.value),
                }}
              />
            ))}
          </EuiFormFieldset>
          <EuiSpacer size="m" />
          {mode === 'create' && (
            <CreateNew {...{ embeddable, closeFlyout, core, services, index }} />
          )}
          {mode === 'existing' && (
            <AssociateExisting
              {...{
                embeddable,
                closeFlyout,
                core,
                services,
                monitors,
                selectedMonitorId,
                setSelectedMonitorId,
              }}
            />
          )}
        </div>
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={closeFlyout}>Cancel</EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton onClick={onCreate} fill>
              {mode === 'existing' ? 'Associate' : 'Create'} monitor
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </div>
  );
}

export default AddAlertingMonitor;
