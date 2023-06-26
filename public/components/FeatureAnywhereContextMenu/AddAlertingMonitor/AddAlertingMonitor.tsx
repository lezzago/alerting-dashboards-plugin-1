/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from 'react';
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
import _ from 'lodash';
import { Formik } from 'formik';
import {
  getInitialValues,
  submit,
} from '../../../pages/CreateMonitor/containers/CreateMonitor/utils/helpers';
import {
  createSavedObjectAssociation,
  validateAssociationIsAllow,
} from '../../../utils/savedObjectHelper';
import { SEARCH_TYPE } from '../../../utils/constants';

function AddAlertingMonitor({
  embeddable,
  closeFlyout,
  core,
  flyoutMode,
  setFlyoutMode,
  monitors,
  selectedMonitorId,
  setSelectedMonitorId,
  index,
  detectorId,
  isAssociateAllowed,
  limitReachedCallout,
}) {
  const history = {
    location: { pathname: '/create-monitor', search: '', hash: '', state: undefined },
    push: () => null,
    goBack: closeFlyout,
  };
  const setFlyout = () => null;
  const { notifications, http: httpClient } = core;
  const title = embeddable.vis.title;
  const timeField = embeddable.vis?.data?.aggs?.aggs?.[1]?.params?.field?.displayName;
  const searchType = flyoutMode === 'adMonitor' ? SEARCH_TYPE.AD : '';
  const initialValues = useMemo(
    () =>
      getInitialValues({ ...history, title, index, timeField, flyoutMode, searchType, detectorId, embeddable }),
    []
  );
  const onCreate = async (values, formikBag) => {
    // Get setting if it is maxed out
    if ((await validateAssociationIsAllow(embeddable.vis.id, true)) === true) {
      submit({
        values,
        formikBag,
        history,
        updateMonitor: () => null,
        notifications,
        httpClient,
        onSuccess: async ({ monitor }) => {
          await createSavedObjectAssociation(monitor._id, embeddable)
            .then((resp) => {
              closeFlyout();
              notifications.toasts.addSuccess({
                title: `The ${monitor.name} is associated with the ${title} visualization`,
                text: 'The alert appears on the visualization when an alarm is triggered',
              });
            })
            .catch((error) => {
              closeFlyout();
              notifications.toasts.addDanger(
                `Monitor "${monitor.name}" failed to associate with the ${title} visualization, but was created successfully. Failed due to ${error.message}.`
              );
            });
        },
      });
    } else {
      closeFlyout();
    }
  };
  const onAssociateExisting = async () => {
    const monitorName = _.get(
      monitors.find((monitor) => monitor.id === selectedMonitorId),
      'name',
      '{Failed to retrieve monitor name}'
    );

    // create saved object or dispatch an event that will create the obj
    await createSavedObjectAssociation(selectedMonitorId, embeddable)
      .then((resp) => {
        closeFlyout();
        notifications.toasts.addSuccess({
          title: `The ${monitorName} is associated with the ${title} visualization`,
          text: 'The alert appears on the visualization when an alarm is triggered',
        });
      })
      .catch((error) => {
        closeFlyout();
        notifications.toasts.addDanger(
          `Monitor "${monitorName}" failed to associate with the ${title} visualization due to ${error.message}.`
        );
      });
  };
  const onSubmit = async ({ handleSubmit, validateForm }) => {
    if (['create', 'adMonitor'].includes(flyoutMode)) {
      const errors = await validateForm();

      if (Object.keys(errors).length > 0) {
        // Delay to allow errors to render
        setTimeout(() => {
          document
            .querySelector('.euiFlyoutBody__overflow')
            .scrollTo({ top: 0, behavior: 'smooth' });
        }, 300);
      }

      handleSubmit();
    } else if (flyoutMode === 'existing') {
      onAssociateExisting();
    }
  };

  return (
    <div className="add-alerting-monitor">
      <Formik initialValues={initialValues} onSubmit={onCreate} validateOnChange={false}>
        {(formikProps) => {
          const { handleSubmit, isSubmitting, validateForm } = formikProps;

          return (
            <>
              <EuiFlyoutHeader hasBorder>
                <EuiTitle>
                  <h2 id="add-alerting-monitor__title">
                    {flyoutMode === 'adMonitor' ? 'Set up alerts' : 'Add alerting monitor'}
                  </h2>
                </EuiTitle>
              </EuiFlyoutHeader>
              <EuiFlyoutBody>
                {!isAssociateAllowed && (
                  <div>
                    {limitReachedCallout}
                    <EuiSpacer size="m" />
                  </div>
                )}
                <div className="add-alerting-monitor__scroll">
                  {flyoutMode !== 'adMonitor' && isAssociateAllowed && (
                    <>
                      <EuiFormFieldset
                        legend={{
                          display: 'hidden',
                          children: (
                            <EuiTitle>
                              <span>
                                Options to create a new monitor or associate an existing monitor
                              </span>
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
                              checked: option.value === flyoutMode,
                              onChange: () => setFlyoutMode(option.value),
                            }}
                          />
                        ))}
                      </EuiFormFieldset>
                      <EuiSpacer size="m" />
                    </>
                  )}
                  {['create', 'adMonitor'].includes(flyoutMode) && (
                    <CreateNew
                      {...{
                        embeddable,
                        core,
                        flyoutMode,
                        formikProps,
                        history,
                        setFlyout,
                        detectorId,
                        isAssociateAllowed,
                      }}
                    />
                  )}
                  {flyoutMode === 'existing' && (
                    <AssociateExisting {...{ monitors, selectedMonitorId, setSelectedMonitorId }} />
                  )}
                  <EuiSpacer size="l" />
                </div>
              </EuiFlyoutBody>
              <EuiFlyoutFooter>
                <EuiFlexGroup justifyContent="spaceBetween">
                  <EuiFlexItem grow={false}>
                    <EuiButtonEmpty onClick={closeFlyout}>Cancel</EuiButtonEmpty>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiButton
                      onClick={() => onSubmit({ handleSubmit, validateForm })}
                      fill
                      isLoading={isSubmitting}
                      disabled={!isAssociateAllowed}
                    >
                      {flyoutMode === 'existing' ? 'Associate' : 'Create'} monitor
                    </EuiButton>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlyoutFooter>
            </>
          );
        }}
      </Formik>
    </div>
  );
}

export default AddAlertingMonitor;