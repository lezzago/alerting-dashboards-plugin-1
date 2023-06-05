import React, { useCallback, useMemo, useState } from 'react';
import {
  EuiFlyoutHeader,
  EuiTitle,
  EuiText,
  EuiSpacer,
  EuiInMemoryTable,
  EuiFlyoutBody,
  EuiEmptyPrompt,
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiTextColor,
} from '@elastic/eui';
import { get } from 'lodash';
import './styles.scss';
import { useColumns } from './helpers';
import { getSavedAugmentVisLoader } from '../../../services';
import { ConfirmUnlinkDetectorModal } from './ConfirmUnlinkModal';
import { deleteAlertingAugmentVisSavedObj } from '../../../utils/savedObjectHelper';

const AssociatedMonitors = ({ embeddable, closeFlyout, setFlyoutMode, monitors }) => {
  const title = embeddable.getTitle();
  const [modalState, setModalState] = useState(undefined);
  const onUnlink = useCallback((item) => {
    setModalState({
      detector: {
        name: item.name,
        id: item.id,
      },
    });
  }, []);
  const onEdit = useCallback(
    (item) => {
      window.open(`alerting#/monitors/${item.id}?action=update-monitor`, '_blank');
      // closeFlyout();
    },
    [closeFlyout]
  );
  // const savedObjectLoader = useMemo(() => getSavedAugmentVisLoader(), []);
  const onUnlinkMonitor = useCallback(async () => {
    try {
      await deleteAlertingAugmentVisSavedObj(embeddable.vis.id, modalState.detector.id);
    } catch (e) {
      console.log(e);
    } finally {
      handleHideModal();
      closeFlyout();
    }

    // await savedObjectLoader.findAll().then(async (resp) => {
    //   if (resp !== undefined) {
    //     const savedAugmentObjects = get(resp, 'hits', []);
    //     // gets all the saved object for this visualization
    //     const savedAugmentForThisVisualization = savedAugmentObjects.filter(
    //       (savedObj) => get(savedObj, 'visId', '') === embeddable.vis.id
    //     );
    //
    //     // find saved Augment object matching detector we want to unlink
    //     // There should only be one detector and vis pairing
    //     const savedAugmentToUnlink = savedAugmentForThisVisualization.find(
    //       (savedObject) => get(savedObject, 'pluginResource.id', '') === modalState.detector.id
    //     );
    //     console.log(savedAugmentToUnlink);
    //     const savedObjectToUnlinkId = get(savedAugmentToUnlink, 'id4', '');
    //     console.log(savedObjectToUnlinkId);
    //     try {
    //       await savedObjectLoader
    //         .delete(savedObjectToUnlinkId);
    //     } catch (e) {
    //       console.log(e);
    //     } finally {
    //       handleHideModal();
    //       closeFlyout();
    //     }
    //       // .then(async () => {
    //       //   core.notifications.toasts.addSuccess({
    //       //     title: `Association removed between the ${savedAugmentToUnlink.name}
    //       //     and the ${title} visualization`,
    //       //     text: "The monitor's alerts do not appear on the visualization. Refresh your dashboard to update the visualization",
    //       //   });
    //       // })
    //       // .catch((error) => {
    //       //   core.notifications.toasts.addDanger(
    //       //     prettifyErrorMessage(
    //       //       `Error unlinking selected monitor: ${error}`
    //       //     )
    //       //   );
    //       //   console.log(`Error unlinking selected monitor: ${error}`);
    //       // })
    //       // .finally(() => {
    //       //   // getDetectors();
    //       //   handleHideModal();
    //       //   closeFlyout();
    //       // });
    //   }
    // });
  }, [closeFlyout, modalState]);
  const columns = useColumns({ onUnlink, onEdit });
  const emptyMsg = (
    <EuiEmptyPrompt
      title={<h3>No monitors to display</h3>}
      titleSize="s"
      body={`There are no alerting monitors associated with ${title} visualization.`}
    />
  );
  const noResultsMsg = (
    <EuiEmptyPrompt
      title={<h3>No monitors to display</h3>}
      titleSize="s"
      body="There are no alerting monitors that match the search result."
    />
  );
  const loadingMsg = <EuiEmptyPrompt body={<EuiLoadingSpinner size="l" />} />;
  const tableProps = {
    items: monitors || [],
    columns,
    search: {
      box: {
        disabled: !monitors || monitors.length === 0,
        incremental: true,
        schema: true,
      },
    },
    hasActions: true,
    pagination: true,
    sorting: true,
    message: monitors ? (monitors.length ? noResultsMsg : emptyMsg) : loadingMsg,
    loading: !monitors,
  };

  const handleHideModal = useCallback(() => {
    setModalState(undefined);
  }, []);

  return (
    <div className="associated-monitors">
      {modalState ? (
        <ConfirmUnlinkDetectorModal
          detector={modalState.detector}
          onHide={handleHideModal}
          onConfirm={onUnlinkMonitor}
          isListLoading={!monitors}
        />
      ) : null}
      <EuiFlyoutHeader hasBorder>
        <EuiTitle>
          <h2 id="associated-monitors__title">
            Associated monitors{' '}
            {monitors && (
              <EuiTextColor color={monitors.length > 0 ? 'default' : 'subdued'}>
                ({monitors.length})
              </EuiTextColor>
            )}
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
          <EuiFlexItem>
            <EuiText>
              <h4>{title}</h4>
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton iconType="link" fill onClick={() => setFlyoutMode('existing')}>
              Associate a monitor
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="l" />
        <EuiInMemoryTable {...tableProps} />
      </EuiFlyoutBody>
    </div>
  );
};

export default AssociatedMonitors;