import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const source = await readFile(new URL('../components/WorkPage.vue', import.meta.url), 'utf8')

test('work homepage keeps only certified-company job results below search', () => {
  assert.match(source, /placeholder="搜索职位、企业或机型"/)
  assert.match(source, /<text class="section-title">认证企业直招<\/text>/)
  assert.match(source, /listJobs\(this\.query\(1\)\)/)
  assert.doesNotMatch(source, /filter-scroll|work-utility-row|work-mode-switch|safety-panel|switchMode|identityOptions|budgetOptions/)
})

test('job cards retain server-backed company and qualification details', () => {
  assert.match(source, /item\.companyName/)
  assert.match(source, /jobLocation\(item\)/)
  assert.match(source, /salary\(item\.salaryMin, item\.salaryMax\)/)
  assert.match(source, /item\.caac/)
  assert.match(source, /aircraftLabel\(item\.aircraft\)/)
  assert.match(source, /item\.statusLabel \|\| statusText\(item\.status\)/)
  assert.match(source, /job-detail\?id=' \+ encodeURIComponent\(item\.id\)/)
})

test('job list provides loading, empty, error retry, and pagination states', () => {
  assert.match(source, /v-if="loading"/)
  assert.match(source, /v-else-if="error"/)
  assert.match(source, /@tap="reload">重试/)
  assert.match(source, /v-else-if="!items\.length"/)
  assert.match(source, /@tap="loadMore"/)
})
