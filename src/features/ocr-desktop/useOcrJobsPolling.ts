import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  fetchChurchOcrJobs,
  isOcrJobTerminal,
  type OcrJobDto,
} from "./ocrApi";

type JobsSource = "idle" | "live" | "error";

/**
 * Poll church OCR jobs while any remain non-terminal (legacy UploadRecords parity).
 */
export function useOcrJobsPolling(opts: {
  readonly churchId: number | null | undefined;
  readonly enabled: boolean;
  readonly limit?: number;
  readonly pollMs?: number;
  readonly jobIds?: readonly string[];
}) {
  const [jobs, setJobs] = useState<readonly OcrJobDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<JobsSource>("idle");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const jobIdFilter = useMemo(
    () =>
      opts.jobIds && opts.jobIds.length > 0
        ? new Set(opts.jobIds.map(String))
        : null,
    [opts.jobIds],
  );

  const reload = useCallback(
    (silent = false) => {
      const churchId = opts.churchId;
      if (!opts.enabled || churchId == null || churchId <= 0) {
        return Promise.resolve();
      }

      if (!silent) {
        setLoading(true);
        setError(null);
      }

      return fetchChurchOcrJobs(churchId, opts.limit ?? 50).then((result) => {
        if (!silent) setLoading(false);
        if (!result.ok) {
          if (!silent) {
            setJobs([]);
            setError(result.message);
            setSource("error");
          }
          return;
        }

        let next = result.jobs;
        if (jobIdFilter) {
          next = next.filter((job) => jobIdFilter.has(job.id));
        }

        setJobs(next);
        setError(null);
        setSource("live");
      });
    },
    [opts.churchId, opts.enabled, opts.limit, jobIdFilter],
  );

  useEffect(() => {
    if (!opts.enabled) {
      return;
    }
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- external OCR jobs fetch bootstrap
    void reload(false).then(() => {
      if (cancelled) return;
    });
    return () => {
      cancelled = true;
    };
  }, [opts.enabled, reload]);

  const activeJobs = opts.enabled ? jobs : [];
  const activeSource = opts.enabled ? source : "idle";
  const activeError = opts.enabled ? error : null;
  const activeLoading = opts.enabled ? loading : false;

  const shouldPoll = useMemo(
    () => opts.enabled && activeJobs.some((job) => !isOcrJobTerminal(job)),
    [opts.enabled, activeJobs],
  );

  useEffect(() => {
    if (!opts.enabled || !shouldPoll) {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
      return;
    }

    const pollMs = opts.pollMs ?? 4000;
    pollRef.current = setInterval(() => {
      void reload(true);
    }, pollMs);

    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [opts.enabled, shouldPoll, reload, opts.pollMs]);

  const allTerminal = useMemo(
    () => activeJobs.length > 0 && activeJobs.every((job) => isOcrJobTerminal(job)),
    [activeJobs],
  );

  return {
    jobs: activeJobs,
    loading: activeLoading,
    error: activeError,
    source: activeSource,
    shouldPoll,
    allTerminal,
    reload: () => reload(false),
  };
}
