import Screen from "@/modules/customer-menu/CustomerMenuScreen";
export default async function Page({
  params,
}: {
  params: Promise<{ table: string }>;
}) {
  const { table } = await params;
  return <Screen key={table} table={table} />;
}
