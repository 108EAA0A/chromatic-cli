import chalk from 'chalk';

import { getDependentStoryFiles, normalizePath } from './getDependentStoryFiles';
import * as git from '../git/git';

jest.mock('../git/git');

const CSF_GLOB = './src sync ^\\.\\/(?:(?!\\.)(?=.)[^/]*?\\.stories\\.js)$';
const VITE_ENTRY = '/virtual:/@storybook/builder-vite/storybook-stories.js';
const statsPath = 'preview-stats.json';

const log = { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() };
const getContext: any = ({
  configDir,
  staticDir,
  ...options
}: { configDir?: string; staticDir?: string } = {}) => ({
  log,
  options: { storybookBaseDir: '.', ...options },
  turboSnap: {},
  storybook: { configDir, staticDir },
  git: {},
});

afterEach(() => {
  log.info.mockReset();
  log.warn.mockReset();
  log.error.mockReset();
  log.debug.mockReset();
});

const getRepositoryRoot = <jest.MockedFunction<typeof git.getRepositoryRoot>>git.getRepositoryRoot;

getRepositoryRoot.mockResolvedValue('/path/to/project');

describe('getDependentStoryFiles', () => {
  it('detects direct changes to CSF files', async () => {
    const changedFiles = ['src/foo.stories.js'];
    const modules = [
      {
        id: './src/foo.stories.js',
        name: './src/foo.stories.js',
        reasons: [{ moduleName: CSF_GLOB }],
      },
      {
        id: CSF_GLOB,
        name: CSF_GLOB,
        reasons: [{ moduleName: './.storybook/generated-stories-entry.js' }],
      },
    ];
    const ctx = getContext();
    const res = await getDependentStoryFiles(ctx, { modules }, statsPath, changedFiles);
    expect(res).toEqual({
      './src/foo.stories.js': ['src/foo.stories.js'],
    });
  });

  it('detects direct changes to CSF files, 6.4 v6 store', async () => {
    const changedFiles = ['src/foo.stories.js'];
    const modules = [
      {
        id: './src/foo.stories.js',
        name: './src/foo.stories.js',
        reasons: [{ moduleName: CSF_GLOB }],
      },
      {
        id: CSF_GLOB,
        name: CSF_GLOB,
        reasons: [{ moduleName: './generated-stories-entry.js' }],
      },
    ];
    const ctx = getContext();
    const res = await getDependentStoryFiles(ctx, { modules }, statsPath, changedFiles);
    expect(res).toEqual({
      './src/foo.stories.js': ['src/foo.stories.js'],
    });
  });

  it('detects direct changes to CSF files, 6.4 v6 store in subdirectory', async () => {
    const changedFiles = ['path/to/project/src/foo.stories.js'];
    const modules = [
      {
        id: './src/foo.stories.js',
        name: './src/foo.stories.js',
        reasons: [{ moduleName: CSF_GLOB }],
      },
      {
        id: CSF_GLOB,
        name: CSF_GLOB,
        reasons: [{ moduleName: './generated-stories-entry.js' }],
      },
    ];
    const ctx = getContext({ storybookBaseDir: 'path/to/project' });
    const res = await getDependentStoryFiles(ctx, { modules }, statsPath, changedFiles);
    expect(res).toEqual({
      './src/foo.stories.js': ['path/to/project/src/foo.stories.js'],
    });
  });

  it('detects direct changes to CSF files, 6.5 v6 store', async () => {
    const changedFiles = ['src/foo.stories.js'];
    const modules = [
      {
        id: './src/foo.stories.js',
        name: './src/foo.stories.js',
        reasons: [{ moduleName: CSF_GLOB }],
      },
      {
        id: CSF_GLOB,
        name: CSF_GLOB,
        reasons: [{ moduleName: './generated-stories-entry.cjs' }],
      },
    ];
    const ctx = getContext();
    const res = await getDependentStoryFiles(ctx, { modules }, statsPath, changedFiles);
    expect(res).toEqual({
      './src/foo.stories.js': ['src/foo.stories.js'],
    });
  });

  it('detects direct changes to CSF files, 6.4 v7 store', async () => {
    const changedFiles = ['src/foo.stories.js'];
    const modules = [
      {
        id: './src/foo.stories.js',
        name: './src/foo.stories.js',
        reasons: [{ moduleName: CSF_GLOB }],
      },
      {
        id: CSF_GLOB,
        name: CSF_GLOB,
        reasons: [{ moduleName: './storybook-stories.js' }],
      },
    ];
    const ctx = getContext();
    const res = await getDependentStoryFiles(ctx, { modules }, statsPath, changedFiles);
    expect(res).toEqual({
      './src/foo.stories.js': ['src/foo.stories.js'],
    });
  });

  it('detects direct changes to CSF files, vite', async () => {
    const changedFiles = ['src/foo.stories.js'];
    const modules = [
      {
        id: './src/foo.stories.js',
        name: './src/foo.stories.js',
        reasons: [{ moduleName: VITE_ENTRY }],
      },
      {
        id: VITE_ENTRY,
        name: VITE_ENTRY,
        reasons: [{ moduleName: '/virtual:/@storybook/builder-vite/vite-app.js' }],
      },
    ];
    const ctx = getContext();
    const res = await getDependentStoryFiles(ctx, { modules }, statsPath, changedFiles);
    expect(res).toEqual({
      './src/foo.stories.js': ['src/foo.stories.js'],
    });
  });

  it('detects indirect changes to CSF files', async () => {
    const changedFiles = ['src/foo.js'];
    const modules = [
      {
        id: './src/foo.js',
        name: './src/foo.js',
        reasons: [{ moduleName: './src/foo.stories.js' }],
      },
      {
        id: './src/foo.stories.js',
        name: './src/foo.stories.js',
        reasons: [{ moduleName: CSF_GLOB }],
      },
      {
        id: CSF_GLOB,
        name: CSF_GLOB,
        reasons: [{ moduleName: './.storybook/generated-stories-entry.js' }],
      },
    ];
    const ctx = getContext();
    const res = await getDependentStoryFiles(ctx, { modules }, statsPath, changedFiles);
    expect(res).toEqual({
      './src/foo.stories.js': ['src/foo.stories.js'],
    });
  });

  it('detects indirect changes to CSF files, angular css resource', async () => {
    const changedFiles = ['src/foo.css'];
    const modules = [
      {
        id: null,
        name: './src/foo.css?ngResource ',
        reasons: [{ moduleName: './src/foo.component.ts' }],
      },
      {
        id: './src/foo.component.ts',
        name: './src/foo.component.ts + 1 modules',
        modules: [{ name: './src/foo.component.ts' }, { name: './src/foo.css?ngResource' }],
        reasons: [{ moduleName: './src/foo.stories.ts' }],
      },
      {
        id: './src/foo.stories.ts',
        name: './src/foo.stories.ts',
        reasons: [{ moduleName: CSF_GLOB }],
      },
      {
        id: CSF_GLOB,
        name: CSF_GLOB,
        reasons: [{ moduleName: './.storybook/generated-stories-entry.js' }],
      },
    ];
    const ctx = getContext();
    const res = await getDependentStoryFiles(ctx, { modules }, statsPath, changedFiles);
    expect(res).toEqual({
      './src/foo.stories.ts': ['src/foo.stories.ts'],
    });
  });

  it('detects indirect changes to CSF files in a single module chunk', async () => {
    const changedFiles = ['src/foo.js'];
    const modules = [
      {
        id: './src/foo.stories.js',
        name: './src/foo.stories.js + 1 modules',
        modules: [{ name: './src/foo.stories.js' }, { name: './src/foo.js' }],
        reasons: [{ moduleName: CSF_GLOB }],
      },
      {
        id: CSF_GLOB,
        name: CSF_GLOB,
        reasons: [{ moduleName: './.storybook/generated-stories-entry.js' }],
      },
    ];
    const ctx = getContext();
    const res = await getDependentStoryFiles(ctx, { modules }, statsPath, changedFiles);
    expect(res).toEqual({
      './src/foo.stories.js': ['src/foo.stories.js', 'src/foo.js'],
    });
  });

  it('supports webpack projectRoot in git subdirectory', async () => {
    const changedFiles = ['services/webapp/src/foo.js'];
    const modules = [
      {
        id: './src/foo.js',
        name: './src/foo.js',
        reasons: [{ moduleName: './src/foo.stories.js' }],
      },
      {
        id: './src/foo.stories.js',
        name: './src/foo.stories.js',
        reasons: [{ moduleName: CSF_GLOB }],
      },
      {
        id: CSF_GLOB,
        name: CSF_GLOB,
        reasons: [{ moduleName: './.storybook/generated-stories-entry.js' }],
      },
    ];
    const ctx = getContext({ storybookBaseDir: 'services/webapp' });
    const res = await getDependentStoryFiles(ctx, { modules }, statsPath, changedFiles);
    expect(res).toEqual({
      './src/foo.stories.js': ['services/webapp/src/foo.stories.js'],
    });
  });

  it('supports absolute module paths', async () => {
    getRepositoryRoot.mockResolvedValueOnce('/path/to/project');
    const absoluteCsfGlob = `/path/to/project/${CSF_GLOB.slice(2)}`;
    const changedFiles = ['src/foo.js'];
    const modules = [
      {
        id: '/path/to/project/src/foo.js',
        name: '/path/to/project/src/foo.js',
        reasons: [{ moduleName: '/path/to/project/src/foo.stories.js' }],
      },
      {
        id: '/path/to/project/src/foo.stories.js',
        name: '/path/to/project/src/foo.stories.js',
        reasons: [{ moduleName: absoluteCsfGlob }],
      },
      {
        id: absoluteCsfGlob,
        name: absoluteCsfGlob,
        // path to generated-stories-entry.js is always relative
        reasons: [{ moduleName: './.storybook/generated-stories-entry.js' }],
      },
    ];
    const ctx = getContext();
    const res = await getDependentStoryFiles(ctx, { modules }, statsPath, changedFiles);
    expect(res).toEqual({
      '/path/to/project/src/foo.stories.js': ['src/foo.stories.js'],
    });
  });

  it('supports absolute module paths with deviating working dir', async () => {
    getRepositoryRoot.mockResolvedValueOnce('/path/to/project');

    const absoluteCsfGlob = `/path/to/project/packages/webapp/${CSF_GLOB.slice(2)}`;
    const changedFiles = ['packages/webapp/src/foo.js'];
    const modules = [
      {
        id: '/path/to/project/packages/webapp/src/foo.js',
        name: '/path/to/project/packages/webapp/src/foo.js',
        reasons: [{ moduleName: '/path/to/project/packages/webapp/src/foo.stories.js' }],
      },
      {
        id: '/path/to/project/packages/webapp/src/foo.stories.js',
        name: '/path/to/project/packages/webapp/src/foo.stories.js',
        reasons: [{ moduleName: absoluteCsfGlob }],
      },
      {
        id: absoluteCsfGlob,
        name: absoluteCsfGlob,
        // path to generated-stories-entry.js is always relative
        reasons: [{ moduleName: './.storybook/generated-stories-entry.js' }],
      },
    ];
    const ctx = getContext({ storybookBaseDir: 'packages/storybook' });
    const res = await getDependentStoryFiles(ctx, { modules }, statsPath, changedFiles);
    expect(res).toEqual({
      '/path/to/project/packages/webapp/src/foo.stories.js': ['packages/webapp/src/foo.stories.js'],
    });
  });

  it('throws on missing CSF glob', async () => {
    const changedFiles = ['src/styles.js'];
    const modules = [
      {
        id: './src/styles.js',
        name: './src/styles.js',
        reasons: [{ moduleName: './path/to/storybook-config/file.js' }],
      },
    ];
    const ctx = getContext({ configDir: 'path/to/storybook-config' });
    await expect(() =>
      getDependentStoryFiles(ctx, { modules }, statsPath, changedFiles)
    ).rejects.toEqual(new Error('Did not find any CSF globs in preview-stats.json'));
  });

  it('bails on changed global file', async () => {
    const changedFiles = ['src/foo.stories.js', 'src/yarn.lock'];
    const modules = [
      {
        id: './src/foo.stories.js',
        name: './src/foo.stories.js',
        reasons: [{ moduleName: CSF_GLOB }],
      },
      {
        id: CSF_GLOB,
        name: CSF_GLOB,
        reasons: [{ moduleName: './.storybook/generated-stories-entry.js' }],
      },
    ];
    const ctx = getContext();
    const res = await getDependentStoryFiles(ctx, { modules }, statsPath, changedFiles);
    expect(res).toEqual(null);
    expect(ctx.turboSnap.bailReason).toEqual({
      changedPackageFiles: ['src/yarn.lock'],
    });
    expect(ctx.log.warn).toHaveBeenCalledWith(
      expect.stringContaining(chalk`Found a package file change in {bold src/yarn.lock}`)
    );
  });

  it('bails on dependency changes to package manifest file', async () => {
    const changedFiles = ['src/foo.stories.js', 'src/package.json'];
    const modules = [
      {
        id: './src/foo.stories.js',
        name: './src/foo.stories.js',
        reasons: [{ moduleName: CSF_GLOB }],
      },
      {
        id: CSF_GLOB,
        name: CSF_GLOB,
        reasons: [{ moduleName: './.storybook/generated-stories-entry.js' }],
      },
    ];
    const rawContext = getContext();
    const ctx = {
      ...rawContext,
      // signifying the package.json file had dependency changes
      git: { ...rawContext.git, changedPackageManifests: ['src/package.json'] },
    };
    const res = await getDependentStoryFiles(ctx, { modules }, statsPath, changedFiles);
    expect(res).toEqual(null);
    expect(ctx.turboSnap.bailReason).toEqual({
      changedPackageFiles: ['src/package.json'],
    });
    expect(ctx.log.warn).toHaveBeenCalledWith(
      expect.stringContaining(chalk`Found a dependency change in {bold src/package.json}`)
    );
  });

  it('does not bail on dependency changes to package manifest file when untraced', async () => {
    const changedFiles = ['src/foo.stories.js', 'src/package.json', 'src/package-lock.json'];
    const modules = [
      {
        id: './src/foo.stories.js',
        name: './src/foo.stories.js',
        reasons: [{ moduleName: CSF_GLOB }],
      },
      {
        id: CSF_GLOB,
        name: CSF_GLOB,
        reasons: [{ moduleName: './.storybook/generated-stories-entry.js' }],
      },
    ];
    const rawContext = getContext({ untraced: ['**/(package.json|package-lock.json|yarn.lock)'] });
    const ctx = {
      ...rawContext,
      // signifying the package.json file had dependency changes
      git: { ...rawContext.git, changedPackageManifests: ['src/package.json'] },
    };
    const res = await getDependentStoryFiles(ctx, { modules }, statsPath, changedFiles);
    expect(ctx.turboSnap.bailReason).toBeUndefined();
    expect(res).toEqual({
      './src/foo.stories.js': ['src/foo.stories.js'],
    });
  });

  it('does not bail when package.json change has no dependency changes', async () => {
    const changedFiles = ['src/foo.stories.js', 'src/package.json'];
    const modules = [
      {
        id: './src/foo.stories.js',
        name: './src/foo.stories.js',
        reasons: [{ moduleName: CSF_GLOB }],
      },
      {
        id: CSF_GLOB,
        name: CSF_GLOB,
        reasons: [{ moduleName: './.storybook/generated-stories-entry.js' }],
      },
    ];
    const ctx = getContext();
    const res = await getDependentStoryFiles(ctx, { modules }, statsPath, changedFiles);
    expect(ctx.turboSnap.bailReason).toBeUndefined();
    expect(res).toEqual({
      './src/foo.stories.js': ['src/foo.stories.js'],
    });
  });

  it('bails on changed Storybook config file', async () => {
    const changedFiles = ['src/foo.stories.js', 'path/to/storybook-config/file.js'];
    const modules = [
      {
        id: './src/foo.stories.js',
        name: './src/foo.stories.js',
        reasons: [{ moduleName: CSF_GLOB }],
      },
      {
        id: CSF_GLOB,
        name: CSF_GLOB,
        reasons: [{ moduleName: './path/to/storybook-config/generated-stories-entry.js' }],
      },
    ];
    const ctx = getContext({ configDir: 'path/to/storybook-config' });
    const res = await getDependentStoryFiles(ctx, { modules }, statsPath, changedFiles);
    expect(res).toEqual(null);
    expect(ctx.turboSnap.bailReason).toEqual({
      changedStorybookFiles: ['path/to/storybook-config/file.js'],
    });
    expect(ctx.log.warn).toHaveBeenCalledWith(
      expect.stringContaining(
        chalk`Found a Storybook config change in {bold path/to/storybook-config/file.js}`
      )
    );
  });

  it('bails on changed dependency of config file', async () => {
    const changedFiles = ['src/styles.js'];
    const modules = [
      {
        id: './src/styles.js',
        name: './src/styles.js',
        reasons: [{ moduleName: './path/to/storybook-config/file.js' }],
      },
      {
        id: CSF_GLOB,
        name: CSF_GLOB,
        reasons: [{ moduleName: './path/to/storybook-config/generated-stories-entry.js' }],
      },
    ];
    const ctx = getContext({ configDir: 'path/to/storybook-config' });
    const res = await getDependentStoryFiles(ctx, { modules }, statsPath, changedFiles);
    expect(res).toEqual(null);
    expect(ctx.turboSnap.bailReason).toEqual({
      changedStorybookFiles: ['path/to/storybook-config/file.js'],
    });
    expect(ctx.log.warn).toHaveBeenCalledWith(
      expect.stringContaining(
        chalk`Found a Storybook config change in {bold path/to/storybook-config/file.js}`
      )
    );
  });

  it('bails on changed dependency of config file if it is in a single module chunk', async () => {
    const changedFiles = ['src/styles.js'];
    const modules = [
      {
        id: './path/to/storybook-config/file.js',
        name: './path/to/storybook-config/file.js + 1 modules',
        modules: [{ name: './path/to/storybook-config/file.js' }, { name: './src/styles.js' }],
        reasons: [],
      },
      {
        id: CSF_GLOB,
        name: CSF_GLOB,
        reasons: [{ moduleName: './path/to/storybook-config/generated-stories-entry.js' }],
      },
    ];
    const ctx = getContext({ configDir: 'path/to/storybook-config' });
    const res = await getDependentStoryFiles(ctx, { modules }, statsPath, changedFiles);
    expect(res).toEqual(null);
    expect(ctx.turboSnap.bailReason).toEqual({
      changedStorybookFiles: ['path/to/storybook-config/file.js', 'src/styles.js'],
    });
    expect(ctx.log.warn).toHaveBeenCalledWith(
      expect.stringContaining(
        chalk`Found a Storybook config change in {bold path/to/storybook-config/file.js}`
      )
    );
  });

  it('bails on changed static file', async () => {
    const changedFiles = ['src/foo.stories.js', 'path/to/statics/image.png'];
    const modules = [
      {
        id: './src/foo.stories.js',
        name: './src/foo.stories.js',
        reasons: [{ moduleName: CSF_GLOB }],
      },
      {
        id: CSF_GLOB,
        name: CSF_GLOB,
        reasons: [{ moduleName: './.storybook/generated-stories-entry.js' }],
      },
    ];
    const ctx = getContext({ staticDir: ['path/to/statics'] });
    const res = await getDependentStoryFiles(ctx, { modules }, statsPath, changedFiles);
    expect(res).toEqual(null);
    expect(ctx.turboSnap.bailReason).toEqual({
      changedStaticFiles: ['path/to/statics/image.png'],
    });
    expect(ctx.log.warn).toHaveBeenCalledWith(
      expect.stringContaining(chalk`Found a static file change in {bold path/to/statics/image.png}`)
    );
  });
  it('ignores untraced files and dependencies with a glob pattern match', async () => {
    const changedFiles = ['src/stories/Button.jsx', 'src/stories/Page.jsx'];
    const modules = [
      {
        id: './src/stories/Button.jsx', // changed
        name: './src/stories/Button.jsx + 1 modules',
        reasons: [
          { moduleName: './src/stories/Button.stories.jsx' },
          { moduleName: './src/stories/Header.jsx + 1 modules' },
        ],
      },
      {
        id: './src/stories/Header.jsx',
        name: './src/stories/Header.jsx + 1 modules',
        reasons: [
          { moduleName: './src/stories/Header.stories.jsx' },
          { moduleName: './src/stories/Page.stories.jsx + 2 modules' },
          { moduleName: './src/stories/Page.jsx' },
        ],
      },
      {
        id: null,
        name: './src/stories/Page.jsx', // changed
        reasons: [{ moduleName: './src/stories/Page.stories.jsx' }],
      },
      {
        id: null,
        name: './src/stories/button.css',
        reasons: [{ moduleName: './src/stories/Button.jsx' }],
      },
      {
        id: null,
        name: './src/stories/header.css',
        reasons: [{ moduleName: './src/stories/Header.jsx' }],
      },
      {
        id: null,
        name: './src/stories/page.css',
        reasons: [{ moduleName: './src/stories/Page.jsx' }],
      },
      {
        id: './src/stories/Button.stories.jsx',
        name: './src/stories/Button.stories.jsx',
        reasons: [{ moduleName: CSF_GLOB }],
      },
      {
        id: './src/stories/Header.stories.jsx',
        name: './src/stories/Header.stories.jsx',
        reasons: [{ moduleName: CSF_GLOB }],
      },
      {
        id: './src/stories/Page.stories.jsx',
        name: './src/stories/Page.stories.jsx + 2 modules',
        modules: [
          { name: './src/stories/Page.stories.jsx' },
          { name: './src/stories/Page.jsx' },
          { name: './src/stories/page.css' },
        ],
        reasons: [{ moduleName: CSF_GLOB }],
      },
      {
        id: 999,
        name: CSF_GLOB,
        reasons: [{ moduleName: './.storybook/generated-stories-entry.js' }],
      },
    ];
    const ctx = getContext({
      staticDir: ['public'],
      untraced: ['**/stories/**'],
    });
    const res = await getDependentStoryFiles(ctx, { modules }, statsPath, changedFiles);
    expect(res).toEqual({});
  });

  it('ignores untraced files', async () => {
    const changedFiles = ['src/utils.js'];
    const modules = [
      {
        id: 1,
        name: './src/utils.js', // changed
        reasons: [{ moduleName: './src/foo.js' }],
      },
      {
        id: 2,
        name: './src/foo.js', // untraced
        reasons: [{ moduleName: './src/foo.stories.js' }],
      },
      {
        id: 3,
        name: './src/foo.stories.js',
        reasons: [{ moduleName: CSF_GLOB }],
      },
      {
        id: 999,
        name: CSF_GLOB,
        reasons: [{ moduleName: './.storybook/generated-stories-entry.js' }],
      },
    ];
    const ctx = getContext({
      staticDir: ['path/to/statics'],
      untraced: ['**/foo.js'],
    });
    const res = await getDependentStoryFiles(ctx, { modules }, statsPath, changedFiles);
    expect(res).toEqual({});
  });

  it('does not bail on untraced global files', async () => {
    const changedFiles = [
      'src/utils.js',
      'src/package.json',
      'src/package-lock.json',
      'src/yarn.lock',
    ];
    const modules = [
      {
        id: './src/utils.js',
        name: './src/utils.js', // changed
        reasons: [{ moduleName: './src/foo.js' }],
      },
      {
        id: './src/foo.js',
        name: './src/foo.js',
        reasons: [{ moduleName: './src/foo.stories.js' }],
      },
      {
        id: './src/foo.stories.js',
        name: './src/foo.stories.js',
        reasons: [{ moduleName: CSF_GLOB }],
      },
      {
        id: 997,
        name: CSF_GLOB,
        reasons: [{ moduleName: './.storybook/generated-stories-entry.js' }],
      },
    ];
    const ctx = getContext({
      untraced: ['**/(package**.json|yarn.lock)'],
    });
    const res = await getDependentStoryFiles(ctx, { modules }, statsPath, changedFiles);
    expect(ctx.turboSnap.bailReason).toBeUndefined();
    expect(res).toEqual({
      './src/foo.stories.js': ['src/foo.stories.js'],
    });
  });

  it('does not bail on untraced Storybook config files that change due to a module sibling', async () => {
    const changedFiles = ['src/utils.js', 'src/packages/design-system/components/button.jsx'];
    const modules = [
      {
        id: './src/utils.js',
        name: './src/utils.js', // changed
        reasons: [{ moduleName: './src/foo.js' }],
      },
      {
        id: './src/foo.js',
        name: './src/foo.js',
        reasons: [{ moduleName: './src/foo.stories.js' }],
      },
      {
        id: './src/foo.stories.js',
        name: './src/foo.stories.js',
        reasons: [{ moduleName: CSF_GLOB }],
      },
      {
        id: './src/packages/design-system/components/button.jsx',
        name: './src/packages/design-system/components/button.jsx', // changed
        reasons: [{ moduleName: './src/decorator.jsx' }],
      },
      {
        id: './src/packages/design-system/components/button.stories.js',
        name: './src/packages/design-system/components/button.stories.js',
        reasons: [{ moduleName: CSF_GLOB }],
      },
      {
        id: './storybook/decorator.jsx',
        name: './storybook/decorator.jsx', // untraced
        reasons: [{ moduleName: CSF_GLOB }],
      },
      {
        id: 997,
        name: CSF_GLOB,
        reasons: [{ moduleName: './.storybook/generated-stories-entry.js' }],
      },
    ];
    const ctx = getContext({
      untraced: ['**/decorator.jsx'],
    });
    const res = await getDependentStoryFiles(ctx, { modules }, statsPath, changedFiles);
    expect(ctx.turboSnap.bailReason).toBeUndefined();
    expect(res).toEqual({
      './src/foo.stories.js': ['src/foo.stories.js'],
    });
  });
  it('does not bail on changed dependency in dynamic import of untraced config file', async () => {
    const changedFiles = ['src/utils.js', 'src/packages/design-system/components/button.jsx'];
    const modules = [
      {
        id: './packages/website/containers/ weak ^\\.\\/.*\\/index$',
        name: './packages/website/containers/ weak ^\\.\\/.*\\/index$',
        reasons: [{ moduleName: './src/packages/design-system/components/button.jsx' }],
      },
      {
        id: './src/packages/design-system/components/button.jsx',
        name: './src/packages/design-system/components/button.jsx + 1 modules', // changed
        reasons: [
          { moduleName: './src/decorator.jsx' },
          { moduleName: './src/packages/design-system/components/button.stories.js' },
        ],
      },
      {
        id: './src/packages/design-system/components/button.stories.js',
        name: './src/packages/design-system/components/button.stories.js',
        reasons: [{ moduleName: CSF_GLOB }],
      },
      {
        id: './storybook/decorator.jsx',
        name: './storybook/decorator.jsx', // untraced
        reasons: [{ moduleName: CSF_GLOB }],
      },
      {
        id: './src/utils.js',
        name: './src/utils.js', // changed
        reasons: [{ moduleName: './src/foo.js' }],
      },
      {
        id: './src/foo.js',
        name: './src/foo.js',
        reasons: [{ moduleName: './src/foo.stories.js' }],
      },
      {
        id: './src/foo.stories.js',
        name: './src/foo.stories.js',
        reasons: [{ moduleName: CSF_GLOB }],
      },
      {
        id: CSF_GLOB,
        name: CSF_GLOB,
        reasons: [{ moduleName: './path/to/storybook-config/generated-stories-entry.js' }],
      },
    ];
    const ctx = getContext({
      configDir: 'path/to/storybook-config',
      untraced: ['**/decorator.jsx'],
    });
    const res = await getDependentStoryFiles(ctx, { modules }, statsPath, changedFiles);
    expect(ctx.turboSnap.bailReason).toBeUndefined();
    expect(res).toEqual({
      './src/foo.stories.js': ['src/foo.stories.js'],
    });
  });
});

describe('normalizePath', () => {
  it('converts absolute paths to relative paths', () => {
    const projectRoot = '/path/to/project';
    const normalized = normalizePath(`${projectRoot}/src/webapp/file.js`, projectRoot);
    expect(normalized).toBe('src/webapp/file.js');
  });

  it('returns already relative paths as-is', () => {
    const projectRoot = '/path/to/project';
    const normalized = normalizePath(`src/webapp/file.js`, projectRoot);
    expect(normalized).toBe('src/webapp/file.js');
  });

  it('handles complex relative paths', () => {
    const projectRoot = '/path/to/project';
    const normalized = normalizePath(`../webapp/file.js`, projectRoot);
    expect(normalized).toBe('../webapp/file.js');
  });

  describe('with workingDir', () => {
    it('makes relative paths relative to the project root', () => {
      const projectRoot = '/path/to/project';
      const normalized = normalizePath(`folder/file.js`, projectRoot, 'packages/webapp');
      expect(normalized).toBe('packages/webapp/folder/file.js');
    });

    it('handles complex relative paths', () => {
      const projectRoot = '/path/to/project';
      const normalized = normalizePath(
        `../../packages/webapp/folder/file.js`,
        projectRoot,
        'packages/tools'
      );
      expect(normalized).toBe('packages/webapp/folder/file.js');
    });

    it('converts absolute paths to relative paths as normal', () => {
      const projectRoot = '/path/to/project';
      const normalized = normalizePath(
        `${projectRoot}/packages/webapp/file.js`,
        projectRoot,
        'packages/webapp'
      );
      expect(normalized).toBe('packages/webapp/file.js');
    });

    it('does not affect paths outside of working dir', () => {
      const projectRoot = '/path/to/project';
      const normalized = normalizePath(
        `${projectRoot}/packages/webapp/file.js`,
        projectRoot,
        'packages/tools'
      );
      expect(normalized).toBe('packages/webapp/file.js');
    });
  });
});
