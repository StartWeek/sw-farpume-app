import Modal from "@/components/common/Modal";
import { useModalGlobal } from "@/store/modalStore";

const NamedModal = ({ name, title, children, ...props }) => {
    const { isOpen, closeModal } = useModalGlobal(name);

    if (!isOpen) {
        return null;
    }

    return (
        <Modal title={title} onClose={closeModal} {...props}>
            {children}
        </Modal>
    );
};

export default NamedModal;
