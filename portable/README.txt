STUDY ROOM — PORTABLE WINDOWS EDITION

START
1. Extract the entire ZIP to a writable folder (for example, Documents).
2. Open Study Room.exe. Your default browser opens the local app.
3. Open Settings and enter your OpenAI API key.
4. Choose New pack, upload a document/video or paste article URLs (one per line), choose 1-120 questions,
   and click Generate study pack.

Question counts above 40 are generated in batches to avoid oversized responses.
Larger quizzes take longer and use more API credits. Matching pairs are selected
separately. A pack is saved only after every batch passes validation.
Missing or repeated questions and matching pairs are automatically topped up,
with at most three extra recovery requests per type to limit API spending.

No Node.js installation is needed. Keep the entire extracted folder together.
The executable is an unsigned personal application, not an installer.
Windows 10/11, x64. Uses the Windows .NET Framework launcher and bundled Node.js.
If the executable cannot start, Start Study Room.cmd provides a fallback.

API KEY AND COST
Create/manage a key at https://platform.openai.com/api-keys
OpenAI API billing is separate from a ChatGPT subscription.
The default model is gpt-5-mini; Settings accepts another Responses API model
that supports structured outputs. Availability depends on your API project.
Your key lives only in the current browser tab and transient generation request.
It is never saved in the portable folder or exported study packs. Refreshing
the browser clears it. Use Forget key in Settings to clear it immediately.
Article text is sent directly from this local app to OpenAI during generation.
Generation requests use store: false; OpenAI's API data policies still apply.

BATCH UPLOADS
Use Ctrl or Shift in the file picker to select multiple files at once.
The 10-source limit is shared across documents, videos, articles, and pasted text.
Files are processed one at a time, with progress and a result for each file.
Successful sources remain loaded if another file fails or you cancel. Failed or
unprocessed files stay selected for retry; completed files are not uploaded again.

UPLOADING DOCUMENTS
Choose New pack, select up to 20 .doc, .docx, .txt, or .md files, then Read selected documents.
Files can be up to 10 MB. Word/Office does not need to be installed.
The app reads text locally without an API key. Review the extracted text in
Loaded sources before generating; documents can be combined with videos,
article links, and pasted text (10 total sources per pack).
Only text is analyzed. Images, scanned pages, layout, and PDFs are not read.
Save a text version or paste the text for unsupported documents. Encrypted or
corrupt files show an error. At least 100 readable characters are required.
Text over 30,000 characters is trimmed and labeled; generation uses only the
shown text, with a combined limit of 160,000 characters across all sources.
Generation sends selected text to OpenAI to analyze concepts, relationships,
and applications and create source-grounded guides and questions.
Original documents are not saved or exported, and are not uploaded to OpenAI.

SHORT-ANSWER PRACTICE
New packs default to 5 short-answer questions; choose 0-40 in New pack.
These are additional to the chosen multiple-choice and matching counts.
Questions include source references, a model answer, and 2-6 key points.
Open Short answer in a generated pack, write your response, and Reveal model
answer. Compare your reasoning with the key points, then mark Needs practice,
Partly covered, or Covered well. This is self-assessment, not automatic grading.
Your responses remain when switching study tabs, but reset when leaving the
pack or refreshing. Start a new short-answer attempt clears all responses.
Short-answer questions and model answers are saved/exported with the pack and
work offline. Older packs still open normally without short-answer questions.
Extra questions take more time and API credits. A pack is saved only after all
requested question types pass validation, including bounded duplicate recovery.

UPLOADING VIDEOS
Choose New pack, select up to 20 videos, and click Upload and transcribe selected videos. Review or edit
the transcript in Loaded sources, then click Generate study pack. Add multiple
videos or combine them with articles and pasted text, up to 20 sources per pack.
Supported videos: MP4, WebM, MPEG (.mpeg or .mpg), up to 25 MB per file.
Compress or split larger recordings, or paste an existing transcript instead.
Videos need spoken audio. Guides and quizzes use speech only; slides, silent
demonstrations, and other visual content are not analyzed.
Uploads are sent to OpenAI using gpt-4o-mini-transcribe and incur transcription
costs in addition to generation. Your Settings model applies to pack generation.
Videos are held in memory during transcription, not written to the portable
folder or included in exported packs. Source filenames are saved for references.
Transcripts remain editable in the tab; only generated material and source
metadata are saved in packs, just like articles. Transcripts under 100 characters
are rejected; those over 30,000 characters are trimmed and labeled.
Cancel stops the request; completed transcripts stay loaded for reuse.
API format/limit reference: https://developers.openai.com/api/docs/guides/speech-to-text

READING ARTICLES
Up to 10 public HTML/text article URLs at a time. The app extracts readable text,
then generates the guide, multiple-choice questions, and matching exercises.
Each lesson and question includes source references. Review important claims.
AI can make mistakes; structural validation is not a guarantee of factual accuracy.
Microsoft Learn module links automatically expand into their lesson pages.
The loaded-source preview shows how many lessons were read. Plain URLs and
pasted Markdown links are supported. Module assessments are excluded.
Login-only, paywalled, PDF, JavaScript-only, and some bot-protected pages cannot
be read automatically. Use "Paste article text instead" for those articles.
The app does not bypass logins or paywalls. IPv6-only targets are not supported.
Limits: 3 MB page download, 30,000 characters per article, 160,000 per pack.
Long articles are trimmed and labeled. You can edit the loaded source text.
The reading budget is shared across URLs and module lessons so later lessons
are not dropped. A module with an unreadable lesson reports a reading failure.
Partial reading failures pause generation so you can choose how to proceed.
Cancel stops the local request; a provider may still charge for work already done.

DIAGRAMS
New guides include 1-2 diagrams per lesson: processes, comparisons, or concept
maps. Diagrams use the lesson sources, work offline, and appear in Print guide.
They are saved inside exported .study.json packs; no image service is needed.
Older packs show concept maps made from their existing saved concepts.

STUDY AND SAVE
Generated packs are automatically saved in data/packs next to the executable.
The included Azure pack has 60 questions and 40 matching pairs.
Export pack downloads a .study.json file you can import into another copy.
Use Delete on a library card, then Delete permanently to remove that pack.
This includes the starter pack. Export a backup first if you may want it later.
Print guide opens the browser print dialog; choose Save as PDF if desired.
Saved packs work without internet or an API key. New articles and AI generation
need internet. Quiz answers reset when you leave a pack or refresh.
Answer choices shuffle when you open a pack or start a new attempt, including
lesson practice and missed-question retries. Correct answers are balanced across
A, B, C, and D, with counts differing by at most one within each attempt.
Copy the WHOLE portable folder to move both the app and your saved library.
Refresh the Library by reopening the app after copying packs into data/packs.

STOP
Use Quit app in the footer to stop the local server. You can close the tab.
The server also stops after 30 minutes with no connected-tab heartbeat or work.
Study Room only listens on your own computer (127.0.0.1), not the local network.

TROUBLESHOOTING
401: Check the API key. 403: Check model/project access.
429: Check API credits, billing, and rate limits, then retry later.
Incomplete/invalid AI output: use fewer articles/questions and try again.
Reopen Study Room.exe to recover an expired browser session.
Do not move the portable folder while the app is running.

DEVELOPER NOTES
Source is in the portable/ directory of the Quiz Generator project.
Build with npm run portable:build, test with npm run portable:test.
No live paid generation was performed without a user-supplied API key.
Third-party license notices are included in THIRD-PARTY-NOTICES.txt.
