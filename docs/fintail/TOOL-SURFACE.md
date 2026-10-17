# Fintail tool surface (Phase 0)

Every native AI tool the agent can call at `b25a95b4`, and whether Fintail
keeps it.

The list comes from scanning `impl ToolAnnotated` blocks (each tool's
`ToolAnnotations::read_only/additive/destructive`) across `crates/`. Test
fixtures in `agent` and `ai_toolset` are excluded. That leaves about 163
tools in 32 crates.

**How hiding works:**
- `crates/ai_tools/src/lib.rs` (`subagent_toolset`, `tools_for_inner`) adds
  each domain toolset unconditionally, per `AiHost`.
- To hide a tool, gate the `add_subtoolset` call there. That covers every
  host at once: chat, agent sessions, channel bots and MCP.
- Per CODING.md, the same gate also applies to the matching web routes and
  search.
- Remote MCP tools (SnapTrade, Pipedream) are not listed here. They go
  through the tool policy (BUILD_PLAN §5).

| Crate | Tools ([R]ead-only / [A]dditive / [D]estructive) | Fintail | Note |
| --- | --- | --- | --- |
| `activity` | ReadActivity[R] | Keep |  |
| `agent_code_mode` | DescribeCodeTools[R], ExecuteCode[D], PresentReview[A] | Hide | Coding agents |
| `agent_inmem` | AskUser[R] | Keep | AskUser |
| `agent_preview` | SharePreview[D] | Hide | Coding agents |
| `agent_session` | DispatchCodingAgent[D], LinkTask[D], ListCodingAgents[R], SetPullRequest[D], TaskPullRequestsTool[R] | Hide | Coding agents, PRs |
| `ai_tools` | ContentSearch[R], DisplayResults[R], LoadTools[R], NameSearch[R], SearchTools[R], SelfKnowledge[R], Subagent[D] | Keep | Search, display, subagents |
| `anthropic` | BashCodeExecution[D], TextEditorCodeExecution[D], WebFetch[R], WebSearch[R] | Keep | WebSearch/WebFetch; code execution useful for analysis, review cost |
| `bots` | ConfigureAgent[D], ConfigureBot[D], CreateBot[A], DeleteBot[D], GetBotWebhooks[R], IssueBotCredential[A], ListAgents[R], ListBots[R], ManageBotChannelAccess[D] | Hide |  |
| `calendar_events` | CreateCalendarEvent[A], CreateConfirmedCalendarEvent[A], DeleteCalendarEvent[D], GetTeamAvailability[R], ListCalendarEvents[R], ListCalendars[R], UpdateCalendarEvent[D] | Hide (v1) |  |
| `calendar_scheduling` | ChangeBooking[D], CreateBookingLink[A], EditBookingLink[D], GetBookingInsights[R], GetBookingRescheduleSlots[R], ListBookingLinks[R], ListBookings[R], ReadBookingSettings[R], UpdateBookingSettings[D] | Hide |  |
| `call` | DeleteCallRecord[D], ReadCallRecord[R], UpdateCallRecord[D] | Hide |  |
| `channels` | CreateChannel[A], CreateChannelMediaUpload[A], DeleteChannelMessage[D], EditChannelMessage[D], ManageChannelParticipants[D], OpenDirectMessage[A], ReactToChannelMessage[D], ReadChannelMessageContext[R], ReadChannelMessages[R], ReadChannelThread[R], RenameChannel[D], SendChannelMessage[D], ShareWithChannel[A] | Hide |  |
| `chat` | ReadChat[R] | Keep |  |
| `cognition` | Decide[R], GenerateObject[R] | Keep |  |
| `crm` | AddToPipeline[A], CreateCompany[A], CreateContact[A], CreatePipeline[A], EditPipeline[D], ExportPipelineCsv[A], FindPipelineEntries[R], GetCompany[R], ImportCompaniesCsv[A], ImportPipelineCsv[A], ListCompanies[R], ListPipelines[R], RemoveFromPipeline[D], UpdatePipelineEntries[D] | Hide | Pattern reused by Fintail watchlists, not the tables |
| `databases` | DeleteDatabaseView[D], DescribeDatabase[R], ListDatabases[R], SaveDatabaseView[A] | Keep | Watchlists on the databases engine |
| `databases_sql` | QueryDatabase[D], SaveDatabaseQuery[A] | Keep | QueryDatabase is marked destructive; review |
| `documents` | CalculateSpreadsheet[R], CommentOnDocument[D], CreateDocument[A], CreateSkill[A], DeleteDocumentComment[D], EditDocument[D], EditDocumentComment[D], EditPresentation[D], EditSpreadsheet[D], EditWordDocument[D], ReadContent[R], ReadDesign[R], ReadIllustratorDocument[R], ReadMetadata[R], ReadPhotoshopDocument[R], ReadPresentation[R], ReadSpreadsheet[R], ReadWordDocument[R], RenameDocument[D], ResolveDocumentComment[D], UploadFile[A] | Keep | Journal, spreadsheets, decks |
| `email` | GetThread[R], ListInboxes[R], ListLabels[R], SendConfirmedEmail[D], SendEmail[D], SetSenderPolicy[D], UpdateThreadLabels[D] | Optional (flag) | Read tools for contract notes; hide SendEmail/SetSenderPolicy |
| `favorites` | SetFavorite[D] | Keep |  |
| `forms` | CreateForm[A], EditForm[D], ListForms[R], ReadForm[R], SetFormAccess[D] | Hide |  |
| `image_generation` | GenerateImage[A] | Optional |  |
| `import` | CreateImportEntity[A], DeleteImportEntity[D], FinalizeImport[A], ImportNotionPage[A], ListImportEntities[R] | Hide | Notion import |
| `initiative` | CreateInitiative[A], DeleteInitiative[D], ListInitiatives[R], ReadInitiative[R], ReadInitiativeActivity[R], UpdateInitiative[D], UpdateInitiativeSharing[D] | Hide |  |
| `notification` | ListNotifications[R], MarkNotificationsDone[A], MarkNotificationsSeen[A], MuteNotifications[D] | Keep | Inbox |
| `pipedream_mcp` | DiscoverConnectors[R] | Keep | Connectors |
| `projects` | CreateProject[A], DuplicateItem[A], MoveToProject[D], MoveToTrash[D], ReadProject[R], RenameItem[D], UpdateSharing[D] | Keep | Folders |
| `properties` | BulkSetEntityPropertyOptions[D], CreateTag[A], DeleteTag[D], EditTag[D], GetEntityProperties[R], ListTags[R], SetEntityProperty[D] | Keep | Tags |
| `routines` | CreateRoutine[A], DeleteRoutine[D], ListRoutines[R], ReadRoutine[R], RunRoutine[A], UpdateRoutine[D] | Keep | Morning brief, alerts |
| `skills` | ListSkills[R], ReadSkill[R], SearchSkills[R] | Keep |  |
| `soup` | ListEntities[R] | Keep |  |
| `teams` | ListTeamMembers[R] | Hide |  |

## Fintail additions (later phases)

- Market data, indicators, filings (EDGAR), macro (FRED), news and X tools.
  All `read_only`.
- Portfolio tools over `crates/portfolio`. Reads are `read_only`; importers
  are `additive`.
- No Fintail tool may be able to place orders or move money (BUILD_PLAN §10).
