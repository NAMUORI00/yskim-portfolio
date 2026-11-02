# Official Ministry of Employment and Labor resume form

Source: Ministry of Employment and Labor, Incheon Bukbu Office, 2019-07-17 notice, attachment `190717표준이력서(안)및자기소개서.hwp`.

- Notice: https://www.moel.go.kr/local/incheonbukbu/news/notice/noticeView.do?bbs_seq=20190700528
- Original: https://www.moel.go.kr/local/incheonbukbu/common/downloadFile.do?bbs_id=LOCAL1&bbs_seq=20190700528&file_seq=20190701275
- Original HWP SHA-256: `a8a39fd8b4312dd00f4c9896553f817e72cdc64e5708f43a4b6ffa3d6f36a0e7`

`moel-standard-resume.pdf` contains the actual first page of that document, exported with Hancom Office to A4, with the stored two-up print option disabled. The remaining five source pages are completion instructions and are not application pages.

The form was not redrawn. Its title, labels, table geometry, mandatory and optional sections remain. At the user's request, middle-dot punctuation in the source's bottom note was replaced with commas. Date examples in the empty career and qualification input cells were cleared before filling. A page counter is added outside the form. Therefore this is the official form used as a template with those explicit punctuation/filling changes, not an assertion that the final file is byte-identical to the source.

Runtime: the browser renders transparent text fields, then pdf-lib copies this template page and overlays those values. The remaining career, academic background and project pages are appended in the same PDF. Missing address, phone, qualifications and support-status values remain blank. Optional personal inputs are held in React state only and are not sent to an API or persisted. The two employment rows contain the first two selected employment records; all selected work/research records appear in the appended career section. Introductions longer than 180 characters continue on the next page rather than being dropped.
