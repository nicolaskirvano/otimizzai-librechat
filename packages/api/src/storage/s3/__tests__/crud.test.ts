import { Readable } from 'stream';
import { mockClient } from 'aws-sdk-client-mock';
import { sdkStreamMixin } from '@smithy/util-stream';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';

const s3Mock = mockClient(S3Client);

jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: jest.fn().mockResolvedValue('https://bucket.s3.amazonaws.com/test-key?signed=true'),
}));

jest.mock('../../../files', () => ({
  deleteRagFile: jest.fn().mockResolvedValue(undefined),
}));

describe('S3 CRUD', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeAll(() => {
    originalEnv = { ...process.env };
    process.env.AWS_REGION = 'us-east-1';
    process.env.AWS_BUCKET_NAME = 'test-bucket';
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  beforeEach(() => {
    s3Mock.reset();

    s3Mock.on(PutObjectCommand).resolves({});

    const stream = new Readable();
    stream.push('test content');
    stream.push(null);
    const sdkStream = sdkStreamMixin(stream);
    s3Mock.on(GetObjectCommand).resolves({ Body: sdkStream });

    jest.clearAllMocks();
  });

  describe('getS3Key', () => {
    it('constructs key from basePath, userId, and fileName', async () => {
      const { getS3Key } = await import('../crud');
      const key = getS3Key('images', 'user123', 'file.png');
      expect(key).toBe('images/user123/file.png');
    });

    it('handles nested file names', async () => {
      const { getS3Key } = await import('../crud');
      const key = getS3Key('files', 'user456', 'folder/subfolder/doc.pdf');
      expect(key).toBe('files/user456/folder/subfolder/doc.pdf');
    });
  });

  describe('extractKeyFromS3Url', () => {
    it('extracts key from virtual-hosted-style URL', async () => {
      const { extractKeyFromS3Url } = await import('../crud');
      const key = extractKeyFromS3Url('https://bucket.s3.amazonaws.com/images/user123/file.png');
      expect(key).toBe('images/user123/file.png');
    });

    it('returns key as-is when not a URL', async () => {
      const { extractKeyFromS3Url } = await import('../crud');
      const key = extractKeyFromS3Url('images/user123/file.png');
      expect(key).toBe('images/user123/file.png');
    });

    it('throws on empty input', async () => {
      const { extractKeyFromS3Url } = await import('../crud');
      expect(() => extractKeyFromS3Url('')).toThrow('Invalid input: URL or key is empty');
    });

    it('handles URL with query parameters', async () => {
      const { extractKeyFromS3Url } = await import('../crud');
      const key = extractKeyFromS3Url(
        'https://bucket.s3.amazonaws.com/images/user123/file.png?X-Amz-Signature=abc',
      );
      expect(key).toBe('images/user123/file.png');
    });
  });

  describe('needsRefresh', () => {
    it('returns false for non-signed URLs', async () => {
      const { needsRefresh } = await import('../crud');
      const result = needsRefresh('https://example.com/file.png', 3600);
      expect(result).toBe(false);
    });

    it('returns true when URL is expired', async () => {
      const { needsRefresh } = await import('../crud');
      const pastDate = new Date(Date.now() - 2 * 60 * 60 * 1000);
      const dateStr = pastDate.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
      const url = `https://bucket.s3.amazonaws.com/key?X-Amz-Signature=abc&X-Amz-Date=${dateStr}&X-Amz-Expires=3600`;
      const result = needsRefresh(url, 3600);
      expect(result).toBe(true);
    });

    it('returns false when URL is not close to expiration', async () => {
      const { needsRefresh } = await import('../crud');
      const futureDate = new Date(Date.now() + 10 * 60 * 1000);
      const dateStr = futureDate.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
      const url = `https://bucket.s3.amazonaws.com/key?X-Amz-Signature=abc&X-Amz-Date=${dateStr}&X-Amz-Expires=7200`;
      const result = needsRefresh(url, 60);
      expect(result).toBe(false);
    });

    it('returns true when missing expiration parameters', async () => {
      const { needsRefresh } = await import('../crud');
      const url = 'https://bucket.s3.amazonaws.com/key?X-Amz-Signature=abc';
      const result = needsRefresh(url, 3600);
      expect(result).toBe(true);
    });
  });

  describe('saveBufferToS3', () => {
    it('uploads buffer and returns signed URL', async () => {
      const { saveBufferToS3 } = await import('../crud');
      const result = await saveBufferToS3({
        userId: 'user123',
        buffer: Buffer.from('test'),
        fileName: 'test.txt',
        basePath: 'files',
      });
      expect(result).toContain('signed=true');
      expect(s3Mock.commandCalls(PutObjectCommand)).toHaveLength(1);
    });

    it('calls PutObjectCommand with correct parameters', async () => {
      const { saveBufferToS3 } = await import('../crud');
      await saveBufferToS3({
        userId: 'user123',
        buffer: Buffer.from('test content'),
        fileName: 'document.pdf',
        basePath: 'documents',
      });

      const calls = s3Mock.commandCalls(PutObjectCommand);
      expect(calls[0].args[0].input).toEqual({
        Bucket: 'test-bucket',
        Key: 'documents/user123/document.pdf',
        Body: Buffer.from('test content'),
      });
    });
  });

  describe('getS3URL', () => {
    it('returns signed URL', async () => {
      const { getS3URL } = await import('../crud');
      const result = await getS3URL({
        userId: 'user123',
        fileName: 'test.txt',
        basePath: 'files',
      });
      expect(result).toContain('signed=true');
    });
  });
});
