import type {AxiosPromise, AxiosRequestConfig} from 'axios'

export type RequestBuilder = (args: AxiosRequestConfig) => AxiosPromise
