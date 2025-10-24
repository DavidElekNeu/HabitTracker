import { SyncService } from './sync.service';

describe('SyncService', () => {
  let service: SyncService;

  beforeEach(() => {
    service = new SyncService();
  });

  it('starts disabled by default', () => {
    expect(service.status().enabled).toBeFalse();
  });

  it('enables preview sync and records provider', async () => {
    await service.enable('Drive');
    expect(service.status().enabled).toBeTrue();
    expect(service.status().provider).toBe('Drive');
    expect(service.status().lastSync).toBeDefined();
  });

  it('disables sync', async () => {
    await service.enable('Drive');
    await service.disable();
    expect(service.status().enabled).toBeFalse();
  });

  it('updates last sync when markSynced is called', async () => {
    await service.enable('Drive');
    const first = service.status().lastSync;
    await new Promise((resolve) => setTimeout(resolve, 5));
    service.markSynced();
    expect(service.status().lastSync).not.toBe(first);
  });
});
