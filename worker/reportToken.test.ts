import assert from 'node:assert/strict'
import test from 'node:test'
import type { AdviceReport } from '../src/types.ts'
import { signReport, verifyEmailToken } from './reportToken.ts'

test('report email token rejects a modified report', async () => {
  const report = {
    id: 'report-1', createdAt: '2026-08-31T00:00:00.000Z', question: '该怎么选择？', mode: 'ai', title: '测试锦囊', diagnosis: '先确认目标。', perspectives: [], synthesis: '小步验证。', options: [], actions: [], disclaimer: '辅助思考。',
  } satisfies AdviceReport
  const emailToken = await signReport(report, 'test-secret')
  assert.equal(await verifyEmailToken({ ...report, emailToken }, 'test-secret'), true)
  assert.equal(await verifyEmailToken({ ...report, title: '被篡改', emailToken }, 'test-secret'), false)
})
