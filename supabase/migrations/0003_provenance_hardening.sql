begin;

-- Earlier prototype builds labeled deterministic fixtures as cached-real.
-- Relabel only analyses that are identifiable as demo fixtures; live uploads
-- use source_type 'live' or 'uploaded' and are intentionally untouched.
update skin_analysis
set origin = 'synthetic'
where origin = 'cached_real_youcam'
  and (
    source_type = 'cached_demo'
    or provider_task_id like 'cached-%'
    or provider_task_id like 'demo-fixture-%'
  );

-- A receipt cannot be real evidence when either stored measurement is synthetic.
update proof_receipt as receipt
set origin = 'synthetic'
where receipt.origin = 'real'
  and exists (
    select 1
    from proof_window as pw
    join skin_analysis as analysis
      on analysis.id in (pw.baseline_analysis_id, receipt.followup_analysis_id)
    where pw.id = receipt.proof_window_id
      and analysis.origin = 'synthetic'
  );

commit;
