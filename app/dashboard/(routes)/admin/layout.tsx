const AdminLayout = ({
    children,
}: {
    children: React.ReactNode;
}) => {
    return (
        <div className="h-full p-0">
            {children}
        </div>
    );
};

export default AdminLayout; 