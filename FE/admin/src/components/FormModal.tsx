import { Modal, type ModalProps } from 'antd';

/** Shared popup shell. Preserve Ant Design's positioning and motion lifecycle. */
export default function FormModal({ className, styles, confirmLoading, ...props }: ModalProps) {
  return <Modal centered width={720} maskClosable={!confirmLoading} keyboard={!confirmLoading} {...props} confirmLoading={confirmLoading} className={['admin-modal', className].filter(Boolean).join(' ')} styles={{ ...styles, body: { maxHeight: 'min(68dvh, calc(100dvh - 190px), 720px)', overflowY: 'auto', overscrollBehavior: 'contain', ...styles?.body } }} />;
}
