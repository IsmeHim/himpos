import CustomerOrder from "../../../components/CustomerOrder";

export default async function TableOrderPage({ params }) {
  const { table } = await params;
  return <CustomerOrder table={decodeURIComponent(table || "A1").toUpperCase()} />;
}
