/*
 *  Copyright 2022 Collate.
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *  http://www.apache.org/licenses/LICENSE-2.0
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

import { Button, Col, Row, Space, Table, Tooltip, Typography } from 'antd';
import { ColumnsType } from 'antd/lib/table';
import { ReactComponent as IconEdit } from 'assets/svg/edit-new.svg';
import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { getEntityName } from 'utils/EntityUtils';
import { ReactComponent as IconDelete } from '../../../assets/svg/ic-delete.svg';

import { ReactComponent as IconCheckMark } from 'assets/svg/ic-check-mark.svg';
import { AxiosError } from 'axios';
import classNames from 'classnames';
import EditTestCaseModal from 'components/AddDataQualityTest/EditTestCaseModal';
import AppBadge from 'components/common/Badge/Badge.component';
import FilterTablePlaceHolder from 'components/common/error-with-placeholder/FilterTablePlaceHolder';
import { StatusBox } from 'components/common/LastRunGraph/LastRunGraph.component';
import NextPrevious from 'components/common/next-previous/NextPrevious';
import { TestCaseStatusModal } from 'components/DataQuality/TestCaseStatusModal/TestCaseStatusModal.component';
import { usePermissionProvider } from 'components/PermissionProvider/PermissionProvider';
import { ResourceEntity } from 'components/PermissionProvider/PermissionProvider.interface';
import { TestCaseStatus } from 'generated/configuration/testResultNotificationConfiguration';
import { Operation } from 'generated/entity/policies/policy';
import { isUndefined } from 'lodash';
import { putTestCaseResult } from 'rest/testAPI';
import { checkPermission } from 'utils/PermissionsUtils';
import { showErrorToast } from 'utils/ToastUtils';
import { getTableTabPath, PAGE_SIZE } from '../../../constants/constants';
import { NO_PERMISSION_FOR_ACTION } from '../../../constants/HelperTextUtil';
import {
  TestCase,
  TestCaseFailureStatus,
  TestCaseResult,
} from '../../../generated/tests/testCase';
import { getNameFromFQN } from '../../../utils/CommonUtils';
import { getDecodedFqn } from '../../../utils/StringsUtils';
import {
  getEntityFqnFromEntityLink,
  getTableExpandableConfig,
} from '../../../utils/TableUtils';
import { getFormattedDateFromSeconds } from '../../../utils/TimeUtils';
import DeleteWidgetModal from '../../common/DeleteWidget/DeleteWidgetModal';
import Loader from '../../Loader/Loader';
import {
  DataQualityTabProps,
  TestCaseAction,
} from '../profilerDashboard.interface';
import './DataQualityTab.style.less';
import TestSummary from './TestSummary';

const DataQualityTab: React.FC<DataQualityTabProps> = ({
  isLoading = false,
  testCases,
  pagingData,
  onTestUpdate,
  onTestCaseResultUpdate,
}) => {
  const { t } = useTranslation();
  const { permissions } = usePermissionProvider();
  const [selectedTestCase, setSelectedTestCase] = useState<TestCaseAction>();

  const testCaseEditPermission = useMemo(() => {
    return checkPermission(
      Operation.EditAll,
      ResourceEntity.TEST_CASE,
      permissions
    );
  }, [permissions]);

  const testCaseDeletePermission = useMemo(() => {
    return checkPermission(
      Operation.Delete,
      ResourceEntity.TEST_CASE,
      permissions
    );
  }, [permissions]);

  const handleCancel = () => {
    setSelectedTestCase(undefined);
  };

  const handleStatusSubmit = async (data: TestCaseFailureStatus) => {
    if (selectedTestCase?.data) {
      const updatedResult: TestCaseResult = {
        ...selectedTestCase.data?.testCaseResult,
        testCaseFailureStatus: data,
      };
      const testCaseFqn = selectedTestCase.data?.fullyQualifiedName ?? '';
      try {
        await putTestCaseResult(testCaseFqn, updatedResult);

        onTestCaseResultUpdate &&
          onTestCaseResultUpdate({
            ...selectedTestCase.data,
            testCaseResult: updatedResult,
          });

        handleCancel();
      } catch (error) {
        showErrorToast(error as AxiosError);
      }
    }

    return;
  };

  const columns = useMemo(() => {
    const data: ColumnsType<TestCase> = [
      {
        title: t('label.name'),
        dataIndex: 'name',
        key: 'name',
        width: 280,
        render: (name: string, record) => {
          const status = record.testCaseResult?.testCaseStatus;

          return (
            <Space data-testid={name}>
              <Tooltip title={status}>
                <div>
                  <StatusBox status={status?.toLocaleLowerCase()} />
                </div>
              </Tooltip>

              <Typography.Paragraph className="m-0" style={{ maxWidth: 280 }}>
                {getEntityName(record)}
              </Typography.Paragraph>
            </Space>
          );
        },
      },
      {
        title: t('label.test-suite'),
        dataIndex: 'testSuite',
        key: 'testSuite',
        width: 250,
        render: (value) => {
          return (
            <Typography.Paragraph data-testid="test-suite-name">
              {getEntityName(value)}
            </Typography.Paragraph>
          );
        },
      },
      {
        title: t('label.table'),
        dataIndex: 'entityLink',
        key: 'table',
        width: 150,
        render: (entityLink) => {
          const tableFqn = getEntityFqnFromEntityLink(entityLink);
          const name = getNameFromFQN(tableFqn);

          return (
            <Link
              data-testid="table-link"
              to={getTableTabPath(tableFqn, 'profiler')}
              onClick={(e) => e.stopPropagation()}>
              {name}
            </Link>
          );
        },
      },
      {
        title: t('label.column'),
        dataIndex: 'entityLink',
        key: 'column',
        width: 150,
        render: (entityLink) => {
          const isColumn = entityLink.includes('::columns::');

          if (isColumn) {
            const name = getNameFromFQN(
              getDecodedFqn(
                getEntityFqnFromEntityLink(entityLink, isColumn),
                true
              )
            );

            return name;
          }

          return '--';
        },
      },
      {
        title: t('label.last-run'),
        dataIndex: 'testCaseResult',
        key: 'lastRun',
        width: 150,
        render: (result: TestCaseResult) =>
          result?.timestamp
            ? getFormattedDateFromSeconds(
                result.timestamp,
                'MMM dd, yyyy HH:mm'
              )
            : '--',
      },
      {
        title: t('label.resolution'),
        dataIndex: 'testCaseResult',
        key: 'resolution',
        width: 100,
        render: (value: TestCaseResult) => {
          const label = value?.testCaseFailureStatus?.testCaseFailureStatusType;

          return label ? (
            <AppBadge
              className={classNames('resolution', label.toLocaleLowerCase())}
              label={label}
            />
          ) : (
            '--'
          );
        },
      },
      {
        title: t('label.action-plural'),
        dataIndex: 'actions',
        key: 'actions',
        width: 100,
        fixed: 'right',
        render: (_, record) => {
          const status = record.testCaseResult?.testCaseStatus;

          return (
            <Row align="middle">
              <Tooltip
                placement="bottomRight"
                title={
                  testCaseEditPermission
                    ? t('label.edit')
                    : NO_PERMISSION_FOR_ACTION
                }>
                <Button
                  className="flex-center"
                  data-testid={`edit-${record.name}`}
                  disabled={!testCaseEditPermission}
                  icon={<IconEdit width={14} />}
                  size="small"
                  type="text"
                  onClick={(e) => {
                    // preventing expand/collapse on click of edit button
                    e.stopPropagation();
                    setSelectedTestCase({ data: record, action: 'UPDATE' });
                  }}
                />
              </Tooltip>

              <Tooltip
                placement="bottomLeft"
                title={
                  testCaseDeletePermission
                    ? t('label.delete')
                    : NO_PERMISSION_FOR_ACTION
                }>
                <Button
                  className="flex-center"
                  data-testid={`delete-${record.name}`}
                  disabled={!testCaseDeletePermission}
                  icon={<IconDelete width={14} />}
                  size="small"
                  type="text"
                  onClick={(e) => {
                    // preventing expand/collapse on click of delete button
                    e.stopPropagation();
                    setSelectedTestCase({ data: record, action: 'DELETE' });
                  }}
                />
              </Tooltip>
              {status === TestCaseStatus.Failed && (
                <Tooltip
                  placement="bottomRight"
                  title={
                    testCaseEditPermission
                      ? t('label.edit-entity', { entity: t('label.status') })
                      : NO_PERMISSION_FOR_ACTION
                  }>
                  <Button
                    className="flex-center"
                    data-testid={`update-status-${record.name}`}
                    disabled={!testCaseEditPermission}
                    icon={<IconCheckMark height={16} width={16} />}
                    size="small"
                    type="text"
                    onClick={(e) => {
                      // preventing expand/collapse on click of edit button
                      e.stopPropagation();
                      setSelectedTestCase({
                        data: record,
                        action: 'UPDATE_STATUS',
                      });
                    }}
                  />
                </Tooltip>
              )}
            </Row>
          );
        },
      },
    ];

    return data;
  }, [testCaseEditPermission, testCaseDeletePermission, testCases]);

  return (
    <Row gutter={16}>
      <Col span={24}>
        <Table
          bordered
          className="test-case-table-container"
          columns={columns}
          data-testid="test-case-table"
          dataSource={testCases}
          expandable={{
            ...getTableExpandableConfig<TestCase>(),
            expandRowByClick: true,
            rowExpandable: () => true,
            expandedRowRender: (recode) => <TestSummary data={recode} />,
          }}
          loading={{
            indicator: <Loader size="small" />,
            spinning: isLoading,
          }}
          locale={{
            emptyText: <FilterTablePlaceHolder />,
          }}
          pagination={false}
          rowKey="name"
          scroll={{ x: 1300 }}
          size="small"
        />
      </Col>
      <Col span={24}>
        {!isUndefined(pagingData) && pagingData.paging.total > PAGE_SIZE && (
          <NextPrevious
            currentPage={pagingData.currentPage}
            pageSize={PAGE_SIZE}
            paging={pagingData.paging}
            pagingHandler={pagingData.onPagingClick}
            totalCount={pagingData.paging.total}
          />
        )}
      </Col>
      <Col>
        <EditTestCaseModal
          testCase={selectedTestCase?.data as TestCase}
          visible={selectedTestCase?.action === 'UPDATE'}
          onCancel={handleCancel}
          onUpdate={onTestUpdate}
        />

        <TestCaseStatusModal
          data={selectedTestCase?.data?.testCaseResult?.testCaseFailureStatus}
          open={selectedTestCase?.action === 'UPDATE_STATUS'}
          onCancel={handleCancel}
          onSubmit={handleStatusSubmit}
        />

        <DeleteWidgetModal
          afterDeleteAction={onTestUpdate}
          allowSoftDelete={false}
          entityId={selectedTestCase?.data?.id ?? ''}
          entityName={selectedTestCase?.data?.name ?? ''}
          entityType="testCase"
          visible={selectedTestCase?.action === 'DELETE'}
          onCancel={handleCancel}
        />
      </Col>
    </Row>
  );
};

export default DataQualityTab;
