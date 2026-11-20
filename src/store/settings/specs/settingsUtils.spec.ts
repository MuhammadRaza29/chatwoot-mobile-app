import {
  buildWebSocketUrl,
  checkValidUrl,
  extractDomain,
  repairPersistedWebSocketUrl,
} from '../settingsUtils';

describe('extractDomain', () => {
  it.each([
    ['app.channelx.au', 'app.channelx.au'],
    ['https://app.channelx.au', 'app.channelx.au'],
    ['http://app.channelx.au', 'app.channelx.au'],
    ['HTTPS://App.ChannelX.AU', 'app.channelx.au'],
  ])('reads the host of %s', (url, expected) => {
    expect(extractDomain({ url })).toBe(expected);
  });

  it.each([
    ['https://app.channelx.au/', 'app.channelx.au'],
    ['app.channelx.au/', 'app.channelx.au'],
    ['https://app.channelx.au/app/accounts/1', 'app.channelx.au'],
    ['app.channelx.au/app/accounts/1', 'app.channelx.au'],
    ['https://app.channelx.au/#/app', 'app.channelx.au'],
  ])('drops the path of %s', (url, expected) => {
    expect(extractDomain({ url })).toBe(expected);
  });

  it.each([
    ['https://channelx.example.com:3000', 'channelx.example.com:3000'],
    ['channelx.example.com:3000', 'channelx.example.com:3000'],
    ['https://channelx.example.com:3000/', 'channelx.example.com:3000'],
  ])('keeps the port of %s', (url, expected) => {
    expect(extractDomain({ url })).toBe(expected);
  });

  it('keeps a www host, which is a different host from the bare domain', () => {
    expect(extractDomain({ url: 'https://www.channelx.au' })).toBe('www.channelx.au');
  });

  it.each([
    ['   https://app.channelx.au', 'app.channelx.au'],
    ['  app.channelx.au  ', 'app.channelx.au'],
    ['https://app.channelx.au\n', 'app.channelx.au'],
  ])('drops the whitespace around %j', (url, expected) => {
    expect(extractDomain({ url })).toBe(expected);
  });

  it.each([['https://'], ['https:// ']])('holds no host for the scheme %j alone', url => {
    expect(extractDomain({ url })).toBe('');
  });

  it('returns unparseable input for the validator to reject', () => {
    expect(extractDomain({ url: 'app channelx au' })).toBe('app channelx au');
  });

  it.each([
    ['trusted.example\n.evil.example'],
    ['trusted.example\t.evil.example'],
    ['trusted.example\r.evil.example'],
    ['https://trusted.example\n.evil.example'],
  ])('does not join %j around its whitespace into another host', url => {
    const host = extractDomain({ url });

    expect(host).toBe(url.trim());
    expect(checkValidUrl({ url: `https://${host}/` })).toBe(false);
  });
});

describe('buildWebSocketUrl', () => {
  it.each([
    ['app.channelx.au', 'wss://app.channelx.au/cable'],
    ['channelx.example.com:3000', 'wss://channelx.example.com:3000/cable'],
  ])('builds the cable endpoint for %s', (host, expected) => {
    expect(buildWebSocketUrl(host)).toBe(expected);
  });
});

describe('repairPersistedWebSocketUrl', () => {
  const stateWith = (settings: Record<string, string>) => ({ settings, auth: { user: 1 } });

  it('rebuilds a websocket URL that kept the scheme of the configured value', () => {
    const state = stateWith({
      baseUrl: 'app.channelx.au',
      installationUrl: 'https://app.channelx.au/',
      webSocketUrl: 'wss://https://app.channelx.au/cable',
    });

    expect(repairPersistedWebSocketUrl(state).settings).toEqual({
      baseUrl: 'app.channelx.au',
      installationUrl: 'https://app.channelx.au/',
      webSocketUrl: 'wss://app.channelx.au/cable',
    });
  });

  it('leaves the rest of the persisted state untouched', () => {
    const state = stateWith({ baseUrl: 'app.channelx.au', webSocketUrl: 'wss://stale/cable' });

    expect(repairPersistedWebSocketUrl(state).auth).toEqual(state.auth);
  });

  it('returns the same state when the websocket URL already matches the host', () => {
    const state = stateWith({
      baseUrl: 'app.channelx.au',
      webSocketUrl: 'wss://app.channelx.au/cable',
    });

    expect(repairPersistedWebSocketUrl(state)).toBe(state);
  });

  it('returns the same state when no host has been configured', () => {
    const state = stateWith({ baseUrl: '', webSocketUrl: '' });

    expect(repairPersistedWebSocketUrl(state)).toBe(state);
  });
});

describe('checkValidUrl', () => {
  it('accepts an absolute URL', () => {
    expect(checkValidUrl({ url: 'https://app.channelx.au/' })).toBe(true);
  });

  it('rejects a URL holding whitespace', () => {
    expect(checkValidUrl({ url: 'https://   https://app.channelx.au/' })).toBe(false);
  });

  it('rejects an unparseable URL', () => {
    expect(checkValidUrl({ url: 'app.channelx.au' })).toBe(false);
  });

  it('rejects an empty URL', () => {
    expect(checkValidUrl({ url: '' })).toBe(false);
  });
});
