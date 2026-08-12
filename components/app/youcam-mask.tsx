import type { SkinAnalysis } from "@/lib/domain";

export function YouCamMask({ analysis }: { analysis: SkinAnalysis }) {
  const maskUrl = analysis.maskUrls.hd_moisture?.[0];
  if (!maskUrl) return null;

  return <section className="app-youcam-mask">
    <div><p className="app-kicker">YouCam visual output</p><h2>Hydration detection mask</h2><p>This overlay is returned by YouCam for visual context. BeautyProof comparisons use the numeric raw score, not the colors in this image.</p></div>
    {/* YouCam mask URLs are short-lived provider results, so render them directly instead of proxying or persisting the image. */}
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img alt="YouCam hydration detection mask" referrerPolicy="no-referrer" src={maskUrl} />
  </section>;
}
