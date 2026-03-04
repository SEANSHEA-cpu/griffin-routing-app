"use client";

import React, { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { ExternalLink, Calculator, Route } from "lucide-react";

function toNumber(v: string) {
  const n = Number(String(v).replace(/[^0-9.\-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function money(n: number) {
  if (!Number.isFinite(n)) return "$0";
  return n.toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

type Lane = "ETHOS" | "VIVE" | "IGO";

type RoutingInputs = {
  age: number;
  termOnly: boolean;
  healthy: boolean;
  wontTakeExam: boolean;
  carrierAlreadySelected: boolean;
  permanentRequested: boolean;
  coverageGap: number;
  ethosMaxFace: number;
  ethosMaxAge: number;
  viveMaxFace: number;
};

export function computeLane(inputs: RoutingInputs): { lane: Lane; reason: string } {
  const {
    age,
    termOnly,
    healthy,
    wontTakeExam,
    carrierAlreadySelected,
    permanentRequested,
    coverageGap,
    ethosMaxFace,
    ethosMaxAge,
    viveMaxFace,
  } = inputs;

  // 0) Won’t take exam ALWAYS routes to Ethos
  if (wontTakeExam) {
    return {
      lane: "ETHOS",
      reason: "Won’t take exam → route to Ethos.",
    };
  }

  // 1) Permanent products route to iGO
  if (permanentRequested) {
    return {
      lane: "IGO",
      reason: "Permanent requested → submit via iGO.",
    };
  }

  // 2) Carrier already selected routes to iGO
  if (carrierAlreadySelected) {
    return {
      lane: "IGO",
      reason: "Carrier already selected → submit application via iGO.",
    };
  }

  // 3) Ethos lane: term, healthy, within age & face thresholds
  const qualifiesEthos =
    termOnly &&
    healthy &&
    age > 0 &&
    age <= ethosMaxAge &&
    coverageGap > 0 &&
    coverageGap <= ethosMaxFace;

  if (qualifiesEthos) {
    return {
      lane: "ETHOS",
      reason: `Simple term case within thresholds (Age ≤ ${ethosMaxAge}, Coverage ≤ ${money(
        ethosMaxFace
      )}) and healthy → route to Ethos.`,
    };
  }

  // 4) VIVE cap: above cap routes to iGO / advanced handling
  if (coverageGap > viveMaxFace) {
    return {
      lane: "IGO",
      reason: `Coverage need exceeds VIVE cap (${money(
        viveMaxFace
      )}) → route to iGO / advanced case design.`,
    };
  }

  // 5) Otherwise: VIVE analysis
  return {
    lane: "VIVE",
    reason:
      "Complex and/or larger coverage need (or impaired / older) → run VIVE carrier analysis.",
  };
}

export default function GriffinRoutingApp() {
  // --- Entry ---
  const [entryPoint, setEntryPoint] = useState<"PFL" | "OBS">("PFL");

  // --- Calculator inputs ---
  const [annualIncome, setAnnualIncome] = useState("120000");
  const [incomeYears, setIncomeYears] = useState("10");
  const [debts, setDebts] = useState("50000");
  const [mortgage, setMortgage] = useState("400000");
  const [education, setEducation] = useState("200000");
  const [existingLife, setExistingLife] = useState("0");

  // --- Qualification inputs ---
  const [age, setAge] = useState("38");
  const [termOnly, setTermOnly] = useState(true);
  const [permanentCoverage, setPermanentCoverage] = useState(false);
  const [healthy, setHealthy] = useState(true);
  const [wontTakeExam, setWontTakeExam] = useState(false);
  const [carrierAlreadySelected, setCarrierAlreadySelected] = useState(false);

  // --- Thresholds / rules ---
  const [viveMaxFace, setViveMaxFace] = useState("2000000");
  const [ethosMaxFace, setEthosMaxFace] = useState("2000000");
  const [ethosMaxAge, setEthosMaxAge] = useState("80");

  // --- Launch links ---
  const [ethosLink, setEthosLink] = useState("https://www.ethos.com");
  const [viveLink, setViveLink] = useState("https://www.griffindp.com");
  const [igoLink, setIgoLink] = useState("https://www.griffindp.com");

  const calc = useMemo(() => {
    const incomeNeed = toNumber(annualIncome) * clamp(toNumber(incomeYears), 0, 50);
    const dimeNeed = toNumber(debts) + toNumber(mortgage) + toNumber(education) + incomeNeed;
    const grossNeed = dimeNeed;
    const gap = Math.max(0, grossNeed - toNumber(existingLife));
    return {
      incomeNeed,
      dimeNeed,
      grossNeed,
      existing: toNumber(existingLife),
      gap,
    };
  }, [annualIncome, incomeYears, debts, mortgage, education, existingLife]);

  const lane: { lane: Lane; reason: string; link: string } = useMemo(() => {
    const face = calc.gap;

    const result = computeLane({
      age: toNumber(age),
      termOnly,
      healthy,
      wontTakeExam,
      carrierAlreadySelected,
      permanentRequested: permanentCoverage,
      coverageGap: face,
      ethosMaxFace: toNumber(ethosMaxFace),
      ethosMaxAge: toNumber(ethosMaxAge),
      viveMaxFace: toNumber(viveMaxFace),
    });

    if (result.lane === "ETHOS") return { ...result, link: ethosLink };
    if (result.lane === "VIVE") return { ...result, link: viveLink };
    return { ...result, link: igoLink };
  }, [
    age,
    termOnly,
    permanentCoverage,
    healthy,
    wontTakeExam,
    carrierAlreadySelected,
    calc.gap,
    ethosMaxFace,
    ethosMaxAge,
    viveMaxFace,
    ethosLink,
    viveLink,
    igoLink,
  ]);

  const laneColor =
    lane.lane === "ETHOS"
      ? "border-emerald-300 bg-emerald-50"
      : lane.lane === "VIVE"
      ? "border-blue-300 bg-blue-50"
      : "border-amber-300 bg-amber-50";

  const laneLabel =
    lane.lane === "ETHOS"
      ? "ETHOS • Digital Term"
      : lane.lane === "VIVE"
      ? "VIVE • Carrier Analysis"
      : "iGO • Application Submission";

  function openLink(url: string) {
    if (!url || !/^https?:\/\//i.test(url)) {
      alert("Please add a valid https:// link for this lane in Settings.");
      return;
    }
    window.open(url, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="min-h-screen w-full bg-slate-50 p-4 md:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Griffin Advisor Routing App</h1>
            <p className="text-slate-600">PFL Referral / Client → Needs Calculator → Ethos, VIVE, or iGO</p>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Route className="h-4 w-4" />
            <span>Operational decision tree with launch links</span>
          </div>
        </div>

        <Tabs defaultValue="route" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="route">Route a Case</TabsTrigger>
            <TabsTrigger value="lanes">Lane Details</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="route" className="mt-4">
            <div className="grid gap-4 md:grid-cols-3">
              <Card className="md:col-span-1">
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-center gap-2">
                    <Calculator className="h-4 w-4" />
                    <h2 className="font-semibold">Entry</h2>
                  </div>

                  <div className="space-y-2">
                    <Label>How did the case start?</Label>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant={entryPoint === "PFL" ? "default" : "outline"}
                        onClick={() => setEntryPoint("PFL")}
                        className="w-full"
                      >
                        PFL Referral
                      </Button>
                      <Button
                        type="button"
                        variant={entryPoint === "OBS" ? "default" : "outline"}
                        onClick={() => setEntryPoint("OBS")}
                        className="w-full"
                      >
                        Client
                      </Button>
                    </div>
                    <p className="text-xs text-slate-500">
                      Entry point is tracked for reporting; routing rules are driven by calculator + qualification.
                    </p>
                  </div>

                  <div className="border-t pt-4 space-y-3">
                    <h3 className="font-semibold">Qualification</h3>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label>Client Age</Label>
                        <Input value={age} onChange={(e) => setAge(e.target.value)} inputMode="numeric" />
                      </div>
                      <div className="space-y-1">
                        <Label>Carrier Selected?</Label>
                        <div className="flex items-center justify-between rounded-md border bg-white px-3 py-2">
                          <span className="text-sm text-slate-700">{carrierAlreadySelected ? "Yes" : "No"}</span>
                          <Switch checked={carrierAlreadySelected} onCheckedChange={setCarrierAlreadySelected} />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label>Coverage Type</Label>
                        <div className="grid grid-cols-1 gap-2">
                          <Button
                            type="button"
                            variant={!permanentCoverage ? "default" : "outline"}
                            className="w-full"
                            onClick={() => {
                              setPermanentCoverage(false);
                              setTermOnly(true);
                            }}
                          >
                            Term
                          </Button>
                          <Button
                            type="button"
                            variant={permanentCoverage ? "default" : "outline"}
                            className="w-full"
                            onClick={() => {
                              setPermanentCoverage(true);
                              setTermOnly(false);
                            }}
                          >
                            Permanent
                          </Button>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label>Healthy Risk?</Label>
                        <div className="flex items-center justify-between rounded-md border bg-white px-3 py-2">
                          <span className="text-sm text-slate-700">{healthy ? "Yes" : "No"}</span>
                          <Switch checked={healthy} onCheckedChange={setHealthy} />
                        </div>

                        <div className="mt-2 flex items-center justify-between rounded-md border bg-white px-3 py-2">
                          <span className="text-sm text-slate-700">Won’t Take Exam? {wontTakeExam ? "Yes" : "No"}</span>
                          <Switch checked={wontTakeExam} onCheckedChange={setWontTakeExam} />
                        </div>
                      </div>
                    </div>

                    <p className="text-xs text-slate-500">
                      If <b>Won’t Take Exam</b> is on, the case routes to <b>Ethos</b>.
                      <br />
                      If <b>Permanent</b> is selected, the case routes directly to <b>iGO</b>.
                      <br />
                      If <b>Carrier Selected</b> is on, the case routes directly to <b>iGO</b>.
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="md:col-span-2">
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Calculator className="h-4 w-4" />
                      <h2 className="font-semibold">Needs Calculator</h2>
                    </div>
                    <div className="text-xs text-slate-500">DIME + Income Replacement (simple)</div>
                  </div>

                  <div className="grid gap-3 md:grid-cols-3">
                    <div className="space-y-1">
                      <Label>Annual Income</Label>
                      <Input value={annualIncome} onChange={(e) => setAnnualIncome(e.target.value)} inputMode="numeric" />
                    </div>
                    <div className="space-y-1">
                      <Label>Years to Replace</Label>
                      <Input value={incomeYears} onChange={(e) => setIncomeYears(e.target.value)} inputMode="numeric" />
                    </div>
                    <div className="space-y-1">
                      <Label>Existing Life Coverage</Label>
                      <Input value={existingLife} onChange={(e) => setExistingLife(e.target.value)} inputMode="numeric" />
                    </div>

                    <div className="space-y-1">
                      <Label>Debt (Non-mortgage)</Label>
                      <Input value={debts} onChange={(e) => setDebts(e.target.value)} inputMode="numeric" />
                    </div>
                    <div className="space-y-1">
                      <Label>Mortgage Balance</Label>
                      <Input value={mortgage} onChange={(e) => setMortgage(e.target.value)} inputMode="numeric" />
                    </div>
                    <div className="space-y-1">
                      <Label>Education Funding</Label>
                      <Input value={education} onChange={(e) => setEducation(e.target.value)} inputMode="numeric" />
                    </div>
                  </div>

                  <div className="grid gap-3 md:grid-cols-3">
                    <Card className="shadow-none">
                      <CardContent className="p-4">
                        <div className="text-xs text-slate-500">Income Need</div>
                        <div className="text-lg font-semibold">{money(calc.incomeNeed)}</div>
                      </CardContent>
                    </Card>
                    <Card className="shadow-none">
                      <CardContent className="p-4">
                        <div className="text-xs text-slate-500">Gross Need (DIME)</div>
                        <div className="text-lg font-semibold">{money(calc.grossNeed)}</div>
                      </CardContent>
                    </Card>
                    <Card className="shadow-none">
                      <CardContent className="p-4">
                        <div className="text-xs text-slate-500">Coverage Gap</div>
                        <div className="text-lg font-semibold">{money(calc.gap)}</div>
                      </CardContent>
                    </Card>
                  </div>

                  <Card className={`border-2 ${laneColor}`}>
                    <CardContent className="p-4 md:p-5 space-y-3">
                      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                        <div>
                          <div className="text-xs text-slate-600">Recommended Lane</div>
                          <div className="text-xl font-semibold">{laneLabel}</div>
                        </div>
                        <Button onClick={() => openLink(lane.link)} className="gap-2">
                          Launch {lane.lane}
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="text-sm text-slate-700">{lane.reason}</div>
                      <div className="text-xs text-slate-500">
                        Entry: <b>{entryPoint === "PFL" ? "PFL Referral" : "Client"}</b>
                      </div>
                    </CardContent>
                  </Card>

                  <div className="text-xs text-slate-500">
                    Note: This is an operational routing guide. Advisors should apply judgment on nuanced underwriting and planning complexity.
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="lanes" className="mt-4">
            <div className="grid gap-4 md:grid-cols-3">
              <Card className="border-2 border-emerald-200">
                <CardContent className="p-5 space-y-3">
                  <div className="text-sm font-semibold">ETHOS • Digital Term</div>
                  <ul className="list-disc pl-5 text-sm text-slate-700 space-y-1">
                    <li>All types of coverage</li>
                    <li>Won’t take an exam</li>
                    <li>Max coverage up to $2,000,000</li>
                  </ul>
                  <Button variant="outline" className="w-full gap-2" onClick={() => openLink(ethosLink)}>
                    Open Ethos Link <ExternalLink className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>

              <Card className="border-2 border-blue-200">
                <CardContent className="p-5 space-y-3">
                  <div className="text-sm font-semibold">VIVE • Carrier Analysis</div>
                  <ul className="list-disc pl-5 text-sm text-slate-700 space-y-1">
                    <li>Term comparison</li>
                    <li>Accelerated U/W up to $2,000,000</li>
                    <li>Carrier analysis up to {money(toNumber(viveMaxFace))}</li>
                    <li>Underwriting strategy + carrier selection</li>
                  </ul>
                  <Button variant="outline" className="w-full gap-2" onClick={() => openLink(viveLink)}>
                    Open VIVE Link <ExternalLink className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>

              <Card className="border-2 border-amber-200">
                <CardContent className="p-5 space-y-3">
                  <div className="text-sm font-semibold">iGO • Application Submission</div>
                  <ul className="list-disc pl-5 text-sm text-slate-700 space-y-1">
                    <li>Permanent coverage</li>
                    <li>Carrier selected (or required)</li>
                    <li>Traditional underwriting submission</li>
                    <li>eSign + validation + send to carrier</li>
                  </ul>
                  <Button variant="outline" className="w-full gap-2" onClick={() => openLink(igoLink)}>
                    Open iGO Link <ExternalLink className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="settings" className="mt-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardContent className="p-5 space-y-4">
                  <h2 className="font-semibold">Routing Rules</h2>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-1">
                      <Label>Ethos Max Face Amount</Label>
                      <Input value={ethosMaxFace} onChange={(e) => setEthosMaxFace(e.target.value)} inputMode="numeric" />
                      <p className="text-xs text-slate-500">Default: $2,000,000</p>
                    </div>
                    <div className="space-y-1">
                      <Label>Ethos Max Age</Label>
                      <Input value={ethosMaxAge} onChange={(e) => setEthosMaxAge(e.target.value)} inputMode="numeric" />
                      <p className="text-xs text-slate-500">Default: 80</p>
                    </div>
                    <div className="space-y-1">
                      <Label>VIVE Max Face Amount</Label>
                      <Input value={viveMaxFace} onChange={(e) => setViveMaxFace(e.target.value)} inputMode="numeric" />
                      <p className="text-xs text-slate-500">Default: $2,000,000</p>
                    </div>
                  </div>
                  <p className="text-xs text-slate-500">
                    Routing logic:
                    <br />• If <b>Won’t Take Exam</b> → Ethos
                    <br />• Else if <b>Permanent</b> → iGO
                    <br />• Else if <b>Carrier Selected</b> → iGO
                    <br />• Else if <b>Term Only</b> + <b>Healthy</b> + within Ethos thresholds → Ethos
                    <br />• Else if <b>Coverage Gap</b> &gt; VIVE cap → iGO
                    <br />• Otherwise → VIVE
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-5 space-y-4">
                  <h2 className="font-semibold">Lane Launch Links</h2>
                  <div className="space-y-2">
                    <Label>Ethos Link (https://)</Label>
                    <Input value={ethosLink} onChange={(e) => setEthosLink(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>VIVE Link (https://)</Label>
                    <Input value={viveLink} onChange={(e) => setViveLink(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>iGO Link (https://)</Label>
                    <Input value={igoLink} onChange={(e) => setIgoLink(e.target.value)} />
                  </div>
                  <p className="text-xs text-slate-500">Tip: Use internal SSO / portal deep links if available.</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        <div className="text-xs text-slate-500">
          Suggested rollout: Put this inside your advisor portal. Keep the links controlled by admin.
        </div>
      </div>
    </div>
  );
}

// --- Minimal routing tests (run only in test mode) ---
if (process.env.NODE_ENV === "test") {
  const base: Omit<
    RoutingInputs,
    "termOnly" | "healthy" | "wontTakeExam" | "carrierAlreadySelected" | "permanentRequested" | "coverageGap"
  > = {
    age: 40,
    ethosMaxAge: 80,
    ethosMaxFace: 2_000_000,
    viveMaxFace: 2_000_000,
  };

  console.assert(
    computeLane({
      ...base,
      termOnly: false,
      healthy: true,
      wontTakeExam: false,
      carrierAlreadySelected: false,
      permanentRequested: true,
      coverageGap: 500_000,
    }).lane === "IGO",
    "Expected Permanent → iGO"
  );

  console.assert(
    computeLane({
      ...base,
      termOnly: true,
      healthy: true,
      wontTakeExam: false,
      carrierAlreadySelected: true,
      permanentRequested: false,
      coverageGap: 500_000,
    }).lane === "IGO",
    "Expected Carrier Selected → iGO"
  );

  console.assert(
    computeLane({
      ...base,
      termOnly: true,
      healthy: true,
      wontTakeExam: false,
      carrierAlreadySelected: false,
      permanentRequested: false,
      coverageGap: 250_000,
    }).lane === "ETHOS",
    "Expected qualifying term → ETHOS"
  );

  console.assert(
    computeLane({
      ...base,
      termOnly: true,
      healthy: false,
      wontTakeExam: false,
      carrierAlreadySelected: false,
      permanentRequested: false,
      coverageGap: 3_000_000,
    }).lane === "IGO",
    "Expected over VIVE cap → iGO"
  );

  console.assert(
    computeLane({
      ...base,
      termOnly: true,
      healthy: false,
      wontTakeExam: false,
      carrierAlreadySelected: false,
      permanentRequested: false,
      coverageGap: 750_000,
    }).lane === "VIVE",
    "Expected non-qualifying term → VIVE"
  );

  console.assert(
    computeLane({
      ...base,
      termOnly: false,
      healthy: false,
      wontTakeExam: true,
      carrierAlreadySelected: true,
      permanentRequested: true,
      coverageGap: 5_000_000,
    }).lane === "ETHOS",
    "Expected Won't Take Exam → ETHOS"
  );
}
