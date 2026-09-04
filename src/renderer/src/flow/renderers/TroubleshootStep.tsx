import { Button } from '@renderer/components/Button'
import { StepShell } from '@renderer/components/StepShell'
import { TidioChat } from '@renderer/components/TidioChat'
import type { CommunityPlatform, TroubleshootStep as TroubleshootStepDef } from '@renderer/flow/types'
import './TroubleshootStep.css'

const COMMUNITY_ICONS: Record<CommunityPlatform, React.ReactNode> = {
  discord: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" aria-hidden>
      <path d="M4 13.6C3 9 4.5 5.5 7 4.5C7.4 5 7.7 5.4 8 5.8C8.6 5.6 9.3 5.5 10 5.5C10.7 5.5 11.4 5.6 12 5.8C12.3 5.4 12.6 5 13 4.5C15.5 5.5 17 9 16 13.6C14.5 14.7 12.8 15.3 11.2 15.5L10.5 14.2C10.8 14.1 11.1 14 11.4 13.8C10.3 14.1 9.7 14.1 8.6 13.8C8.9 14 9.2 14.1 9.5 14.2L8.8 15.5C7.2 15.3 5.5 14.7 4 13.6Z" />
      <circle cx="7.7" cy="10.4" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="12.3" cy="10.4" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  ),
  facebook: (
    <svg viewBox="0 0 20 20" fill="currentColor" stroke="none" aria-hidden>
      <path d="M12.5 3.5H10.3C8.1 3.5 6.6 5 6.6 7.3V9.3H4.5V12.1H6.6V19H9.6V12.1H11.9L12.3 9.3H9.6V7.6C9.6 6.8 9.9 6.2 11 6.2H12.5V3.5Z" />
    </svg>
  )
}

export function TroubleshootStep({
  step,
  onNext,
  onGoto
}: {
  step: TroubleshootStepDef
  onNext: () => void
  onGoto: (stepId: string) => void
}): React.JSX.Element {
  const open = (url: string): void => {
    void window.api?.openExternal(url)
  }

  return (
    <StepShell
      eyebrow={step.eyebrow}
      title={step.title}
      subtitle={step.subtitle}
      media={step.media}
      primary={
        <Button size="lg" withArrow onClick={onNext}>
          Back to setup
        </Button>
      }
    >
      <div className="troubleshoot-step__list">
        {step.issues.map((issue) => (
          <div key={issue.title} className="troubleshoot-step__issue">
            <div className="troubleshoot-step__issue-title">{issue.title}</div>
            <p className="troubleshoot-step__issue-desc">{issue.description}</p>
            {issue.guideLink && (
              // Jumps straight to the relevant step in the main guide
              // without forcing anyone through the rest of it - the
              // standard Back button on that step returns here, since
              // onGoto pushes this screen onto history same as any other
              // navigation.
              <button type="button" className="troubleshoot-step__guide-link" onClick={() => onGoto(issue.guideLink!.goto)}>
                {issue.guideLink.label} →
              </button>
            )}
          </div>
        ))}
      </div>
      {step.communityLinks.length > 0 && (
        <div className="troubleshoot-step__community">
          {step.communityLinks.map((link) => (
            <button key={link.url} type="button" className="troubleshoot-step__community-btn" onClick={() => open(link.url)}>
              {COMMUNITY_ICONS[link.platform]}
              {link.label}
            </button>
          ))}
        </div>
      )}
      <TidioChat />
    </StepShell>
  )
}
