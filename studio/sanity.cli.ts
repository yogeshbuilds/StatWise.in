import {defineCliConfig} from 'sanity/cli'

export default defineCliConfig({
  api: {
    projectId: 'mpsmehrh',
    dataset: 'production'
  },
  studioHost: 'statwise',
  deployment: {
    appId: 'pe12fru9ov3fhj7fexupjsic',
    /**
     * Enable auto-updates for studios.
     * Learn more at https://www.sanity.io/docs/studio/latest-version-of-sanity#k47faf43faf56
     */
    autoUpdates: true,
  },
})
