# datetime-awareness.Tests.ps1
# Pester 5 test suite for datetime awareness correctness.
# Origin: datetime-awareness-fix PRD (2026-05-11)
# Portable: designed to run in ANY Squad project. File-dependent tests
# are skipped with an informative message when squad.agent.md is absent.

# Resolve squad.agent.md path at discovery time so -Skip expressions work
$squadAgentDiscoveryPath = Join-Path $PSScriptRoot ".." ".github" "agents" "squad.agent.md"
$squadAgentFileExists = Test-Path $squadAgentDiscoveryPath

Describe "DateTime Awareness" {

    BeforeAll {
        $script:squadAgentPath = Join-Path $PSScriptRoot ".." ".github" "agents" "squad.agent.md"
        $script:squadAgentExists = Test-Path $script:squadAgentPath
        if ($script:squadAgentExists) {
            $script:squadAgentContent = Get-Content $script:squadAgentPath -Raw -Encoding UTF8
        }
    }

    # -- 1. Shell Command Validity --
    Context "Shell Command Validity" {
        It "Get-Date produces output matching the expected datetime regex" {
            $result = Get-Date -Format "dddd, yyyy-MM-ddTHH:mm:ssK"
            $result | Should -Match '^[A-Za-z]+, \d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$'
        }
    }

    # -- 2. Day-of-Week Correctness --
    Context "Day-of-Week Correctness" {
        It "2026-05-11 is Monday" {
            $day = [System.DateTime]::Parse("2026-05-11").DayOfWeek
            $day | Should -Be "Monday"
        }
        It "2026-01-01 is Thursday" {
            $day = [System.DateTime]::Parse("2026-01-01").DayOfWeek
            $day | Should -Be "Thursday"
        }
        It "2025-12-25 is Thursday" {
            $day = [System.DateTime]::Parse("2025-12-25").DayOfWeek
            $day | Should -Be "Thursday"
        }
        It "2026-07-04 is Saturday" {
            $day = [System.DateTime]::Parse("2026-07-04").DayOfWeek
            $day | Should -Be "Saturday"
        }
        It "2026-10-31 is Saturday" {
            $day = [System.DateTime]::Parse("2026-10-31").DayOfWeek
            $day | Should -Be "Saturday"
        }
    }

    # -- 3. Timezone Offset Validity --
    Context "Timezone Offset Validity" {
        It "UTC offset matches +/-HH:MM format" {
            $result = Get-Date -Format "dddd, yyyy-MM-ddTHH:mm:ssK"
            $offset = $result -replace '^.+([+-]\d{2}:\d{2})$', '$1'
            $offset | Should -Match '^[+-]\d{2}:\d{2}$'
        }
        It "UTC offset hours are within -12 to +14" {
            $result = Get-Date -Format "dddd, yyyy-MM-ddTHH:mm:ssK"
            $offset = $result -replace '^.+([+-]\d{2}:\d{2})$', '$1'
            $hours = [int]$offset.Substring(0, 3)
            $hours | Should -BeGreaterOrEqual -12
            $hours | Should -BeLessOrEqual 14
        }
    }

    # -- 4. Template Placeholder Coverage --
    Context "Template Placeholder Coverage" {
        It "squad.agent.md contains at least 3 template sections with datetime variables" -Skip:(-not $squadAgentFileExists) {
            $matches = [regex]::Matches($script:squadAgentContent, '(?i)CURRENT_DATETIME:\s*\{current_datetime\}|CURRENT_DATETIME:\s*\S')
            $matches.Count | Should -BeGreaterOrEqual 3 -Because "at least 3 spawn template sections should contain CURRENT_DATETIME"
        }
        It "squad.agent.md spawn templates contain DAY_OF_WEEK or {day_of_week}" -Skip:(-not $squadAgentFileExists) {
            $script:squadAgentContent | Should -Match '(DAY_OF_WEEK|day_of_week)'
        }
        It "squad.agent.md spawn templates contain TIMEZONE" -Skip:(-not $squadAgentFileExists) {
            $script:squadAgentContent | Should -Match 'TIMEZONE'
        }
        It "Skipped: squad.agent.md not found at expected path" -Skip:$squadAgentFileExists {
            Set-ItResult -Skipped -Because "squad.agent.md not found at $script:squadAgentPath -- file-dependent tests skipped (portable mode)"
        }
    }

    # -- 5. No "Derive" Instruction Remaining --
    Context "No Derive Instruction Remaining" {
        It "squad.agent.md has zero matches for 'Derive.*DAY_OF_WEEK'" -Skip:(-not $squadAgentFileExists) {
            $matches = [regex]::Matches($script:squadAgentContent, 'Derive.*DAY_OF_WEEK')
            $matches.Count | Should -Be 0 -Because "old derive instructions must be removed"
        }
        It "squad.agent.md has zero matches for 'derive.*day.*week' (case-insensitive)" -Skip:(-not $squadAgentFileExists) {
            # Exclude negation patterns (NEVER derive, NOT derive, Do NOT derive) — those are warnings, not instructions
            $allMatches = [regex]::Matches($script:squadAgentContent, '(?i)derive.*day.*week')
            $positiveMatches = $allMatches | Where-Object {
                $line = $script:squadAgentContent.Substring(
                    [Math]::Max(0, $_.Index - 30), [Math]::Min(30, $_.Index)
                )
                $line -notmatch '(?i)(NEVER|NOT|Do NOT|don''t)\s'
            }
            @($positiveMatches).Count | Should -Be 0 -Because "no instruction should tell agents to derive day-of-week"
        }
        It "Skipped: squad.agent.md not found" -Skip:$squadAgentFileExists {
            Set-ItResult -Skipped -Because "squad.agent.md not found -- derive-check skipped (portable mode)"
        }
    }

    # -- 6. Date Format Parsing --
    Context "Date Format Parsing" {
        It "Parses Bash-style offset without colon: Monday, 2026-05-11T14:30:48-0700" {
            $bashStr = "Monday, 2026-05-11T14:30:48-0700"
            $bashStr | Should -Match '^(?<day>[A-Za-z]+), (?<dt>\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})(?<tz>[+-]\d{2}:?\d{2})$'
            $dayName = ($bashStr -split ',')[0].Trim()
            $dayName | Should -Be "Monday"
        }
        It "Parses PowerShell-style offset with colon: Monday, 2026-05-11T14:30:48-07:00" {
            $psStr = "Monday, 2026-05-11T14:30:48-07:00"
            $psStr | Should -Match '^(?<day>[A-Za-z]+), (?<dt>\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})(?<tz>[+-]\d{2}:?\d{2})$'
            $dayName = ($psStr -split ',')[0].Trim()
            $dayName | Should -Be "Monday"
        }
        It "Extracts datetime and offset from both formats" {
            $bash = "Monday, 2026-05-11T14:30:48-0700"
            $ps   = "Monday, 2026-05-11T14:30:48-07:00"
            # Bash: normalize offset
            $bashNorm = $bash -replace '([+-]\d{2})(\d{2})$', '$1:$2'
            $bashNorm | Should -Be "Monday, 2026-05-11T14:30:48-07:00"
            # PowerShell: already correct
            $ps | Should -Be "Monday, 2026-05-11T14:30:48-07:00"
        }
    }

    # -- 7. Current Date Verification --
    Context "Current Date Verification" {
        It "Get-Date day name matches expected English day name" {
            $fromFormat = (Get-Date -Format "dddd")
            $expectedDay = (Get-Culture).DateTimeFormat.GetDayName([System.DateTime]::Now.DayOfWeek)
            $fromFormat | Should -Be $expectedDay -Because "Get-Date dddd should return localized day name matching current culture"
        }
    }

    # -- 8. No Mental Math Warning Present --
    Context "No Mental Math Warning Present" {
        It "squad.agent.md contains 'NEVER derive' warning" -Skip:(-not $squadAgentFileExists) {
            $script:squadAgentContent | Should -Match '(?i)NEVER derive'
        }
        It "squad.agent.md contains 'LLMs miscalculate' warning" -Skip:(-not $squadAgentFileExists) {
            $script:squadAgentContent | Should -Match '(?i)LLMs miscalculate'
        }
        It "Skipped: squad.agent.md not found" -Skip:$squadAgentFileExists {
            Set-ItResult -Skipped -Because "squad.agent.md not found -- warning-check skipped (portable mode)"
        }
    }

    # -- 9. Session Start Instruction Present --
    Context "Session Start Instruction Present" {
        It "squad.agent.md contains Get-Date in session start instructions" -Skip:(-not $squadAgentFileExists) {
            $script:squadAgentContent | Should -Match 'Get-Date'
        }
        It "Skipped: squad.agent.md not found" -Skip:$squadAgentFileExists {
            Set-ItResult -Skipped -Because "squad.agent.md not found -- session-start check skipped (portable mode)"
        }
    }

    # -- 10. Direct Mode Exemplar Present --
    Context "Direct Mode Exemplar Present" {
        It "squad.agent.md contains 'What day/time is it?' exemplar" -Skip:(-not $squadAgentFileExists) {
            $script:squadAgentContent | Should -Match 'What day/time is it\?'
        }
        It "Skipped: squad.agent.md not found" -Skip:$squadAgentFileExists {
            Set-ItResult -Skipped -Because "squad.agent.md not found -- exemplar check skipped (portable mode)"
        }
    }

    # -- 11. Scribe Template DateTime Fields --
    Context "Scribe Template DateTime Fields" {
        It "Scribe spawn section contains CURRENT_DATETIME" -Skip:(-not $squadAgentFileExists) {
            $parts = @($script:squadAgentContent -split 'You are the Scribe\.')
            $parts.Count | Should -BeGreaterThan 1 -Because "Scribe section must exist in squad.agent.md"
            $scribeSection = $parts[1]
            $scribeSection | Should -Match 'CURRENT_DATETIME'
        }
        It "Scribe spawn section contains DAY_OF_WEEK" -Skip:(-not $squadAgentFileExists) {
            $parts = @($script:squadAgentContent -split 'You are the Scribe\.')
            $parts.Count | Should -BeGreaterThan 1 -Because "Scribe section must exist in squad.agent.md"
            $scribeSection = $parts[1]
            $scribeSection | Should -Match 'DAY_OF_WEEK'
        }
        It "Scribe spawn section contains TIMEZONE" -Skip:(-not $squadAgentFileExists) {
            $parts = @($script:squadAgentContent -split 'You are the Scribe\.')
            $parts.Count | Should -BeGreaterThan 1 -Because "Scribe section must exist in squad.agent.md"
            $scribeSection = $parts[1]
            $scribeSection | Should -Match 'TIMEZONE'
        }
    }

    # -- 12. Full Spawn Template DateTime Fields --
    Context "Full Spawn Template DateTime Fields" {
        It "Full agent spawn template contains CURRENT_DATETIME, DAY_OF_WEEK, and TIMEZONE" -Skip:(-not $squadAgentFileExists) {
            $parts = @($script:squadAgentContent -split 'Template for any agent')
            $parts.Count | Should -BeGreaterThan 1 -Because "Full spawn template section must exist in squad.agent.md"
            $fullSection = $parts[1]
            $fullSection | Should -Match 'CURRENT_DATETIME'
            $fullSection | Should -Match 'DAY_OF_WEEK'
            $fullSection | Should -Match 'TIMEZONE'
        }
        It "DAY_OF_WEEK appears in at least 3 distinct template sections" -Skip:(-not $squadAgentFileExists) {
            $matches = [regex]::Matches($script:squadAgentContent, '(?i)DAY_OF_WEEK:\s*\{?')
            $matches.Count | Should -BeGreaterOrEqual 3 -Because "Lightweight, Full, and Scribe templates should all contain DAY_OF_WEEK"
        }
    }

    # -- 13. Explore Agent Template DateTime Fields --
    Context "Explore Agent Template DateTime Fields" {
        It "Explore agent one-liner contains CURRENT_DATETIME" -Skip:(-not $squadAgentFileExists) {
            $exploreLine = @($script:squadAgentContent -split "`n" | Where-Object {
                $_ -match 'agent_type:\s*"explore"' -and $_ -match 'You are \{Name\}'
            })
            $exploreLine.Count | Should -BeGreaterThan 0 -Because "explore agent one-liner template should exist"
            $exploreLine[0] | Should -Match 'CURRENT_DATETIME' -Because "explore template needs datetime injection"
        }
        It "Explore agent one-liner contains DAY_OF_WEEK" -Skip:(-not $squadAgentFileExists) {
            $exploreLine = @($script:squadAgentContent -split "`n" | Where-Object {
                $_ -match 'agent_type:\s*"explore"' -and $_ -match 'You are \{Name\}'
            })
            $exploreLine.Count | Should -BeGreaterThan 0 -Because "explore agent one-liner template should exist"
            $exploreLine[0] | Should -Match 'DAY_OF_WEEK' -Because "explore template needs day-of-week injection"
        }
        It "Explore agent one-liner contains TIMEZONE" -Skip:(-not $squadAgentFileExists) {
            $exploreLine = @($script:squadAgentContent -split "`n" | Where-Object {
                $_ -match 'agent_type:\s*"explore"' -and $_ -match 'You are \{Name\}'
            })
            $exploreLine.Count | Should -BeGreaterThan 0 -Because "explore agent one-liner template should exist"
            $exploreLine[0] | Should -Match 'TIMEZONE' -Because "explore template needs timezone injection"
        }
    }

    # -- 14. DATES Warning in Spawn Templates --
    Context "DATES Warning in Spawn Templates" {
        It "DATES warning exists with 'Never infer or guess the date'" -Skip:(-not $squadAgentFileExists) {
            $script:squadAgentContent | Should -Match 'DATES:.*Never infer or guess the date'
        }
        It "DATES warning references CURRENT_DATETIME" -Skip:(-not $squadAgentFileExists) {
            $script:squadAgentContent | Should -Match 'DATES:.*CURRENT_DATETIME'
        }
    }

    # -- 15. No System Tag Day Derivation --
    Context "No System Tag Day Derivation" {
        It "No instruction to derive DAY_OF_WEEK from current_datetime system tag" -Skip:(-not $squadAgentFileExists) {
            $m1 = [regex]::Matches($script:squadAgentContent, '(?i)Derive.*DAY_OF_WEEK.*from.*current_datetime')
            $m2 = [regex]::Matches($script:squadAgentContent, '(?i)from.*<current_datetime>.*day')
            ($m1.Count + $m2.Count) | Should -Be 0 -Because "the old buggy instruction to derive DAY_OF_WEEK from <current_datetime> must be removed"
        }
    }

    # -- 16. Bash Alternative Command Present --
    Context "Bash Alternative Command Present" {
        It "Bash date command alternative is documented" -Skip:(-not $squadAgentFileExists) {
            $script:squadAgentContent | Should -Match 'date \+"%A'
        }
    }

    # -- 17. Directive Timestamp Format --
    Context "Directive Timestamp Format" {
        It "Directive capture section uses {timestamp} placeholder" -Skip:(-not $squadAgentFileExists) {
            $script:squadAgentContent | Should -Match 'copilot-directive-\{timestamp\}'
        }
        It "Directive format includes a timestamp-based filename pattern" -Skip:(-not $squadAgentFileExists) {
            $script:squadAgentContent | Should -Match '\{timestamp\}:\s*User directive'
        }
    }

    # -- 18. Orchestration Log ISO 8601 --
    Context "Orchestration Log ISO 8601" {
        It "Orchestration log instructions mention ISO 8601" -Skip:(-not $squadAgentFileExists) {
            $script:squadAgentContent | Should -Match '(?i)ORCHESTRATION LOG.*ISO 8601'
        }
        It "Session log instructions mention ISO 8601" -Skip:(-not $squadAgentFileExists) {
            $script:squadAgentContent | Should -Match '(?i)SESSION LOG.*ISO 8601'
        }
    }

    # -- 19. Template Consistency -- All Spawn Templates Have All 3 Fields --
    Context "Template Consistency -- All Spawn Templates Have All 3 Fields" {
        It "Every code block with CURRENT_DATETIME also has DAY_OF_WEEK and TIMEZONE" -Skip:(-not $squadAgentFileExists) {
            $codeBlocks = [regex]::Matches($script:squadAgentContent, '(?s)```[^\n]*\n(.*?)```')
            $blocksWithDatetime = @($codeBlocks | Where-Object { $_.Groups[1].Value -match 'CURRENT_DATETIME:' })
            $blocksWithAll3 = @($blocksWithDatetime | Where-Object {
                $_.Groups[1].Value -match 'DAY_OF_WEEK:' -and $_.Groups[1].Value -match 'TIMEZONE:'
            })
            $blocksWithDatetime.Count | Should -BeGreaterOrEqual 1 -Because "at least one spawn template should exist"
            $blocksWithAll3.Count | Should -Be $blocksWithDatetime.Count -Because "every template with CURRENT_DATETIME must also have DAY_OF_WEEK and TIMEZONE"
        }
    }

    # -- 20. Get-Date Format String Correctness --
    Context "Get-Date Format String Correctness" {
        It "Get-Date format string is exactly 'dddd, yyyy-MM-ddTHH:mm:ssK'" -Skip:(-not $squadAgentFileExists) {
            $script:squadAgentContent | Should -Match 'Get-Date -Format "dddd, yyyy-MM-ddTHH:mm:ssK"'
        }
        It "Format string appears in session-start section" -Skip:(-not $squadAgentFileExists) {
            $parts = @($script:squadAgentContent -split 'On every session start')
            $parts.Count | Should -BeGreaterThan 1 -Because "session-start section must exist in squad.agent.md"
            $sessionSection = $parts[1]
            $sessionSection | Should -Match 'dddd, yyyy-MM-ddTHH:mm:ssK'
        }
        It "Format string appears in Direct Mode exemplar section" -Skip:(-not $squadAgentFileExists) {
            $parts = @($script:squadAgentContent -split 'What day/time is it\?')
            $parts.Count | Should -BeGreaterThan 1 -Because "Direct Mode exemplar section must exist in squad.agent.md"
            $directSection = $parts[1]
            $directSection | Should -Match 'dddd, yyyy-MM-ddTHH:mm:ssK'
        }
    }
}
