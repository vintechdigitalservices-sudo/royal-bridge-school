import { REPORT_TYPES } from "./config.js";
import { gradeFor } from "./reporting.js";
import { SCHOOL_CONFIG } from "./config.js";
import { appPath } from "./paths.js";

function esc(v) {
  return String(v == null ? "" : v)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function fmt(v) {
  if (v == null || v === "") return "&mdash;";
  return esc(v);
}

function num(v) {
  if (v == null || v === "" || v !== v) return "&ndash;";
  return esc(Number(v).toFixed(Number(v) % 1 === 0 ? 0 : 2));
}

function coverPage(meta) {
  const title = meta.reportType === REPORT_TYPES.CUMULATIVE ? "CUMULATIVE REPORT SHEET" : "TERMLY REPORT SHEET";
  return `
  <section class="rs-page rs-cover">
    <img class="rs-crest" src="${esc(appPath(SCHOOL_CONFIG.logoFile))}" alt="${esc(meta.schoolName)} crest" />
    <div class="rs-cover-name">${esc(meta.schoolName)},</div>
    <div class="rs-cover-address">${esc(meta.coverAddress)}</div>
    <div class="rs-cover-rule"></div>
    <div class="rs-cover-title">${esc(title)}</div>
    <div class="rs-cover-motto">......... ${esc(meta.motto)}</div>
    <div class="rs-cover-meta">
      <span>SESSION: <b>${esc(meta.session)}</b></span>
      <span>TERM: <b>${esc(meta.termName)}</b></span>
    </div>
    <div class="rs-cover-foot">${esc(meta.schoolName)} &mdash; ${esc(meta.motto)}</div>
  </section>`;
}

function metaGrid(meta) {
  const s = meta.student;
  const rows = [
    ["NAME OF STUDENT", s.name],
    ["ADMISSION NO.", s.admissionNumber],
    ["CLASS", s.className],
    ["SESSION", meta.session],
    ["TERM", meta.termName],
    ["SEX", s.sex],
    ["AGE", s.age],
    ["NEXT TERM BEGINS", meta.nextTermBegins]
  ];
  return `
  <div class="rs-meta">
    <div class="rs-meta-grid">
      ${rows
        .map(
          ([k, v]) =>
            `<div class="rs-meta-row"><div class="rs-meta-label">${esc(k)}</div><div class="rs-meta-value">${fmt(v)}</div></div>`
        )
        .join("")}
    </div>
  </div>`;
}

function banner(meta) {
  return `
  <div class="rs-banner">
    <div class="rs-banner-left">ROYALBRIDGE SCHOOL</div>
    <div class="rs-banner-right">${esc(meta.reportTitle || "TERMLY REPORT SHEET")}</div>
  </div>`;
}

function summaryGrid(cells) {
  return `<div class="rs-summary">${cells
    .map(([k, v]) => `<div class="rs-summary-cell"><div class="k">${esc(k)}</div><div class="v">${v}</div></div>`)
    .join("")}</div>`;
}

function termlyTable(academic) {
  const body = academic.rows
    .map(
      (r) => `<tr>
      <td class="subj">${esc(r.label)}</td>
      <td class="num">${num(r.ca)}</td>
      <td class="num">${num(r.mid)}</td>
      <td class="num">${num(r.exam)}</td>
      <td class="num"><b>${num(r.total)}</b></td>
      <td class="num">${esc(r.remark)}</td>
    </tr>`
    )
    .join("");
  return `
  <table class="rs-table">
    <thead>
      <tr>
        <th style="text-align:left;width:26%">SUBJECT</th>
        <th>C/A TEST<br/>20%</th>
        <th>MID TERM TEST<br/>20%</th>
        <th>EXAM<br/>60%</th>
        <th>TOTAL<br/>100%</th>
        <th style="width:16%">REMARK</th>
      </tr>
    </thead>
    <tbody>${body}</tbody>
    <tfoot>
      <tr class="total-row">
        <td colspan="4" style="text-align:right">TOTAL SCORE</td>
        <td class="num">${num(academic.totalScore)}</td>
        <td class="num">&nbsp;</td>
      </tr>
    </tfoot>
  </table>`;
}

function cumulativeTable(academic) {
  const body = academic.rows
    .map(
      (r) => `<tr>
      <td class="subj">${esc(r.label)}</td>
      <td class="num">${num(r.terms ? r.terms[0] : null)}</td>
      <td class="num">${num(r.terms ? r.terms[1] : null)}</td>
      <td class="num">${num(r.terms ? r.terms[2] : null)}</td>
      <td class="num"><b>${num(r.average)}</b></td>
      <td class="num">${esc(r.remark)}</td>
    </tr>`
    )
    .join("");
  const termRows = (academic.termSummary || [])
    .map(
      (t) => `<tr>
      <td class="subj">${esc(t.term)}</td>
      <td class="num">${num(t.average)}</td>
      <td class="num">${esc(t.remark)}</td>
      <td class="num">${num(t.total)}</td>
    </tr>`
    )
    .join("");
  return `
  <table class="rs-table">
    <thead>
      <tr>
        <th style="text-align:left;width:26%">SUBJECT</th>
        <th>1ST TERM</th>
        <th>2ND TERM</th>
        <th>3RD TERM</th>
        <th>AVERAGE</th>
        <th style="width:16%">REMARK</th>
      </tr>
    </thead>
    <tbody>${body}</tbody>
  </table>
  <div class="rs-grid-title">Term Summary</div>
  <table class="rs-table">
    <thead><tr><th style="text-align:left">TERMS</th><th>AVERAGES</th><th>REMARKS</th><th>TOTAL</th></tr></thead>
    <tbody>${termRows}</tbody>
  </table>`;
}

function pageTwo(model) {
  const { meta, academic, position, classStats } = model;
  const isCumulative = meta.reportType === REPORT_TYPES.CUMULATIVE;
  if (!academic) {
    return `<section class="rs-page"><div class="rs-banner"><div class="rs-banner-left">ROYALBRIDGE SCHOOL</div><div class="rs-banner-right">${esc(meta.reportTitle)}</div></div><p style="margin-top:24px">No academic records available yet for this report.</p></section>`;
  }
  const cells = isCumulative
    ? [
        ["SUBJECTS", esc(academic.subjectCount)],
        ["CUMULATIVE AVG", num(academic.cumulativeAverage)],
        ["POSITION", position ? esc(position) : "&ndash;"],
        ["CLASS SIZE", esc(classStats.count)]
      ]
    : [
        ["SUBJECTS", esc(academic.subjectCount)],
        ["TOTAL SCORE", num(academic.totalScore)],
        ["AVERAGE", num(academic.average)],
        ["POSITION", position ? esc(position) : "&ndash;"]
      ];
  return `
  <section class="rs-page">
    ${banner(meta)}
    ${metaGrid(meta)}
    ${isCumulative ? cumulativeTable(academic) : termlyTable(academic)}
    ${summaryGrid(cells)}
    <div class="rs-foot">
      <span>CLASS HIGHEST AVG: <b>${num(classStats.highest)}</b></span>
      <span>CLASS LOWEST AVG: <b>${num(classStats.lowest)}</b></span>
      <span>${esc(meta.schoolName)} &mdash; ${esc(meta.session)} ${esc(meta.termName)}</span>
    </div>
  </section>`;
}

function ratingRows(list, values) {
  return list
    .map((k) => `<tr><td class="subj">${esc(k)}</td><td class="num">${fmt(values ? values[k] : null)}</td></tr>`)
    .join("");
}

function commentBlock(title, text, signName) {
  return `
  <div class="rs-comment">
    <div class="rs-comment-title">${esc(title)}</div>
    <div class="rs-comment-text">${text ? esc(text) : "&nbsp;"}</div>
    <div class="rs-sign"><span>Signature / Date</span><b>${esc(signName || "")}</b></div>
  </div>`;
}

function pageThree(model) {
  const { meta } = model;
  return `
  <section class="rs-page">
    ${banner(meta)}
    <div class="rs-two">
      <div>
        <div class="rs-grid-title">Affective Traits</div>
        <table class="rs-table">
          <thead><tr><th style="text-align:left">TRAIT</th><th style="width:34%">RATING</th></tr></thead>
          <tbody>${ratingRows(meta.affectiveTraits, meta.affective)}</tbody>
        </table>
      </div>
      <div>
        <div class="rs-grid-title">Psychomotor Skills</div>
        <table class="rs-table">
          <thead><tr><th style="text-align:left">SKILL</th><th style="width:34%">RATING</th></tr></thead>
          <tbody>${ratingRows(meta.psychomotorSkills, meta.psychomotor)}</tbody>
        </table>
        <div class="rs-legend">${(meta.ratingLegend || []).map((r) => `<span>${esc(r)}</span>`).join("")}</div>
      </div>
    </div>
    <div class="rs-comments">
      ${commentBlock("Teacher's Comment", meta.teacherComment, "Teacher")}
      ${commentBlock("Head Teacher's Comment", meta.headTeacherComment, "Head Teacher")}
      ${commentBlock("Proprietor's Comment", meta.proprietorComment, "Proprietor")}
      <div class="rs-two">
        ${commentBlock("Parent's Comment", meta.parentComment, "Parent / Guardian")}
        <div class="rs-comment">
          <div class="rs-comment-title">Next Term</div>
          <div class="rs-comment-text">Begins: <b>${fmt(meta.nextTermBegins)}</b></div>
          <div class="rs-sign"><span>Fees due next term</span><b>${meta.dueNextTerm !== "" && meta.dueNextTerm != null ? "&#8358;" + esc(Number(meta.dueNextTerm).toLocaleString()) : "&mdash;"}</b></div>
        </div>
      </div>
    </div>
    <div class="rs-foot">
      <span>${esc(meta.schoolName)} &mdash; ${esc(meta.motto)}</span>
      <span>${esc(meta.reportTitle)} &middot; ${esc(meta.session)} ${esc(meta.termName)}</span>
    </div>
  </section>`;
}

export function reportSheetHTML(model) {
  if (!model) return `<div class="alert alert-warning">Report not found.</div>`;
  return coverPage(model.meta) + pageTwo(model) + pageThree(model);
}

export function renderReportSheet(container, model) {
  if (!container) return;
  container.innerHTML = reportSheetHTML(model);
}

export function printReport() {
  window.print();
}

export { gradeFor };
