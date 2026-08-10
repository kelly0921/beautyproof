import Link from "next/link";

const steps = [
  { label: "Fund", role: "Brand" },
  { label: "Match", role: "Consumer" },
  { label: "Enroll", role: "Consumer" },
  { label: "Trial", role: "Consumer" },
  { label: "Reward", role: "Consumer" },
  { label: "Coverage", role: "Brand" },
] as const;

export function DemoProgress({ activeStep, role, title, detail }: { activeStep: number; role: "brand" | "consumer"; title: string; detail: string }) {
  return <section aria-label="Guided demo progress" className="demo-progress-dock">
    <header>
      <div><span className="demo-progress-mark">B</span><div><strong>BeautyProof guided demo</strong><small>One funded evidence loop</small></div></div>
      <div className="demo-progress-count"><span>Step</span><strong>{activeStep} / {steps.length}</strong></div>
    </header>
    <ol>
      {steps.map((step, index) => {
        const number = index + 1;
        const state = number < activeStep ? "complete" : number === activeStep ? "active" : "upcoming";
        return <li aria-current={state === "active" ? "step" : undefined} className={state} key={step.label}>
          <span>{state === "complete" ? "✓" : number}</span>
          <div><strong>{step.label}</strong><small>{step.role}</small></div>
        </li>;
      })}
    </ol>
    <footer>
      <span className={`demo-role-badge ${role}`}>{role === "brand" ? "Brand view" : "Consumer app"}</span>
      <div><strong>{title}</strong><small>{detail}</small></div>
      {activeStep === steps.length ? <Link href="/demo">Restart demo</Link> : null}
    </footer>
  </section>;
}
