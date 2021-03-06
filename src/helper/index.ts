/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-console */
import {
  ActionInputParams,
  composeMsg,
  createPullRequest,
  formatCommits,
  getMergeUrl,
  sendMsgToWeChat
} from './base'
import axios from 'axios'

export const mergeBranch = async (params: ActionInputParams): Promise<void> => {
  const {repository, githubToken, headBranch, syncBranches, wechatKey} = params
  const arr = syncBranches.split(',')
  const branches = [...new Set(arr)].filter(Boolean)
  // eslint-disable-next-line @typescript-eslint/prefer-for-of
  for (let i = 0; i < branches.length; i++) {
    const baseBranch = branches[i].trim()
    try {
      if (baseBranch) {
        await axios({
          method: 'POST',
          headers: {
            Accept: 'application/vnd.github.v3+json',
            'content-type': 'application/json',
            Authorization: `Bearer ${githubToken}`
          },
          url: getMergeUrl(repository),
          data: {
            base: baseBranch,
            head: headBranch
          }
        })
      }
    } catch (error) {
      console.error('mergeBranch----', error)
      const {response} = (error as any) || {}
      const {status, statusText, data} = response || {}
      const {message} = data || {}
      if (message.includes('protected')) {
        const statusParams = {
          ...params,
          baseBranch
        }
        await createPullRequest(statusParams)
        return
      }
      let conflict = ''
      if (status === 409 || statusText === 'Conflict') {
        conflict = '请解决存在的冲突'
      }
      const result = {
        msgtype: 'text',
        text: {
          content: `❌项目${repository}:【${headBranch}】分支合并到【${baseBranch}】出错，出错原因：${message}${conflict}`,
          mentioned_mobile_list: ['@all']
        }
      }
      await sendMsgToWeChat({result, webHook: wechatKey})
    }
  }
}

export const sendMsg = async (params: ActionInputParams): Promise<void> => {
  const {repository, headBranch, commits, wechatKey} = params
  if (commits.length) {
    const commitsList = formatCommits(commits)
    const content = composeMsg({commitsList, head: headBranch, repository})
    const result = {
      msgtype: 'markdown',
      markdown: {content}
    }
    await sendMsgToWeChat({result, webHook: wechatKey})
  }
}
