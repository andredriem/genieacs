export let current_restart_exit_code: number | null = null;

export const ExitCode = {
  OK: 0,
  SAFE_RESTART: 50,
  FATAL: 1,
} as const;

export function processErrorMessage(error: Error): void {
    // If uncaught exception name is MongoServerSelectionError
    if (error.name === "MongoServerSelectionError") {
        current_restart_exit_code = ExitCode.SAFE_RESTART;
    }

}

export function resetCurrentRestartExitCode(): void {
    current_restart_exit_code = null;
}
