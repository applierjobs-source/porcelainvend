import { MachineWizard } from "@/components/MachineWizard";
import { getPublicBaseUrl } from "@/lib/public-url";

export default async function NewMachinePage() {
  const baseUrl = await getPublicBaseUrl();

  return (
    <div>
      <h1 className="text-2xl font-semibold text-zinc-900">New machine</h1>
      <p className="mt-1 text-sm text-zinc-600">
        Five-step setup: identity, Squarespace, webhook secret, SwitchBot, then
        kiosk assets.
      </p>
      <div className="mt-8">
        <MachineWizard baseUrl={baseUrl} />
      </div>
    </div>
  );
}
