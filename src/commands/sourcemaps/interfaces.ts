import {MultipartPayload, MultipartValue} from '../../helpers/upload'

export class Sourcemap {
  public gitData?: GitData
  public minifiedFilePath: string
  public minifiedPathPrefix?: string
  public minifiedUrl: string
  public relativePath: string
  public sourcemapPath: string

  constructor(
    minifiedFilePath: string,
    minifiedUrl: string,
    sourcemapPath: string,
    relativePath: string,
    minifiedPathPrefix?: string
  ) {
    this.minifiedFilePath = minifiedFilePath
    this.minifiedPathPrefix = minifiedPathPrefix
    this.minifiedUrl = minifiedUrl
    this.relativePath = relativePath
    this.sourcemapPath = sourcemapPath
  }

  public addRepositoryData(gitData: GitData) {
    this.gitData = gitData
  }

  public asMultipartPayload(
    cliVersion: string,
    service: string,
    version: string,
    projectPath: string
  ): MultipartPayload {
    const content = new Map<string, MultipartValue>([
      ['metadata', this.getMetadataPayload(cliVersion, service, version, projectPath)],
      ['sourcemap', {type: 'file', path: this.sourcemapPath, options: {filename: 'sourcemap', contentType: 'application/gzip'}}],
      // ['minified_file', {type: 'file', path: this.minifiedFilePath, options: {filename: 'minified_file'}}],
    ])
    if (this.gitData !== undefined && this.gitData.gitRepositoryPayload !== undefined) {
      content.set('repository', {
        type: 'string',
        options: {
          contentType: 'application/json',
          filename: 'repository',
        },
        value: this.gitData.gitRepositoryPayload,
      })
    }

    return {
      content,
    }
  }

  private getMetadataPayload(
    cliVersion: string,
    service: string,
    version: string,
    projectPath: string
  ): MultipartValue {
    const metadata: {[k: string]: any} = {
      assetPath: this.minifiedUrl,
      service,
      version,
    }
    if (this.gitData !== undefined) {
      metadata.git_repository_url = this.gitData.gitRepositoryURL
      metadata.git_commit_sha = this.gitData.gitCommitSha
    }

    return {
      type: 'string',
      options: {
        contentType: 'application/json',
        filename: 'metadata',
      },
      value: JSON.stringify(metadata),
    }
  }
}

export interface GitData {
  gitCommitSha: string
  gitRepositoryPayload?: string
  gitRepositoryURL: string
}
