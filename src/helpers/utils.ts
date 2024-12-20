import type { AxiosRequestConfig } from 'axios'

import axios from 'axios'
import {ProxyAgent} from 'proxy-agent'

// The buildPath function is used to concatenate several paths. The goal is to have a function working for both unix
// paths and URL whereas standard path.join does not work with both.
export const buildPath = (...args: string[]) =>
  args
    .map((part, i) => {
      if (i === 0) {
        // For the first part, drop all / at the end of the path
        return part.trim().replace(/[\/]*$/g, '')
      } else {
        // For the following parts, remove all / at the beginning and at the end
        return part.trim().replace(/(^[\/]*|[\/]*$)/g, '')
      }
    })
    // Filter out empty parts
    .filter((x) => x.length)
    // Join all these parts with /
    .join('/')

type ProxyType =
  | 'http'
  | 'https'
  | 'socks'
  | 'socks4'
  | 'socks4a'
  | 'socks5'
  | 'socks5h'
  | 'pac+data'
  | 'pac+file'
  | 'pac+ftp'
  | 'pac+http'
  | 'pac+https'

export interface ProxyConfiguration {
  auth?: {
    password: string
    username: string
  }
  host?: string
  port?: number
  protocol: ProxyType
}

export interface RequestOptions {
  apiKey: string
  appKey?: string
  baseUrl: string
  headers?: Map<string, string>
  overrideUrl?: string
  proxyOpts?: ProxyConfiguration
}

export const getProxyUrl = (options?: ProxyConfiguration): string => {
  if (!options) {
    return ''
  }

  const {auth, host, port, protocol} = options

  if (!host || !port) {
    return ''
  }

  const authFragment = auth ? `${auth.username}:${auth.password}@` : ''

  return `${protocol}://${authFragment}${host}:${port}`
}

const createProxyAgentForUrl = (proxyUrl: string) => {
  if (!proxyUrl) {
    // Let the default proxy agent discover environment variables.
    return new ProxyAgent()
  }

  return new ProxyAgent({
    getProxyForUrl: (url) => {
      // Do not proxy the WebSocket connections.
      if (url?.match(/^wss?:/)) {
        return ''
      }

      return proxyUrl
    },
  })
}

const proxyAgentCache = new Map<string, ProxyAgent>()

export const getProxyAgent = (proxyOpts?: ProxyConfiguration): ProxyAgent => {
  const proxyUrlFromConfiguration = getProxyUrl(proxyOpts)

  let proxyAgent = proxyAgentCache.get(proxyUrlFromConfiguration)
  if (!proxyAgent) {
    proxyAgent = createProxyAgentForUrl(proxyUrlFromConfiguration)
    proxyAgentCache.set(proxyUrlFromConfiguration, proxyAgent)
  }

  return proxyAgent
}

export const getRequestBuilder = (options: RequestOptions) => {
  const { apiKey, appKey, baseUrl, overrideUrl, proxyOpts } = options
  const overrideArgs = (args: AxiosRequestConfig) => {
    const newArguments = {
      ...args,
      headers: {
        'KF-API-KEY': apiKey,
        ...(appKey ? { 'KF-APPLICATION-KEY': appKey } : {}),
        ...args.headers,
      } as NonNullable<typeof args.headers>,
    }

    if (overrideUrl !== undefined) {
      newArguments.url = overrideUrl
    }

    const proxyAgent = getProxyAgent(proxyOpts)
    if (proxyAgent) {
      newArguments.httpAgent = proxyAgent
      newArguments.httpsAgent = proxyAgent
    }

    if (options.headers !== undefined) {
      options.headers.forEach((value, key) => {
        newArguments.headers[key] = value
      })
    }

    return newArguments
  }

  const baseConfiguration: AxiosRequestConfig = {
    baseURL: baseUrl,
    // Disabling proxy in Axios config as it's not working properly
    // the passed httpAgent/httpsAgent are handling the proxy instead.
    proxy: false,
  }

  return (args: AxiosRequestConfig) => {
    const instance = axios.create(baseConfiguration);
    return instance((overrideArgs(args)));
  }
}

export const pluralize = (nb: number, singular: string, plural: string) => {
  if (nb >= 2) {
    return `${nb} ${plural}`
  }

  return `${nb} ${singular}`
}
