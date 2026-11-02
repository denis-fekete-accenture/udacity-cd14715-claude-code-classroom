import { describe, expect, it } from 'vitest';
import { ReviewReportJSONSchema, ReviewReportSchema } from '../src/types/report-types';
import * as testReports from './test_reports';

describe('CodeReviewOrchestrator output schema', () => {
  describe('valid schema inputs', () => {
    it('passes the complete review report JSON schema to the SDK', () => {
      expect(ReviewReportJSONSchema).toBeDefined();
      expect(ReviewReportJSONSchema).toHaveProperty('type', 'object');
    });
  
    it('parse() returns the data for a valid report', () => {
      expect(ReviewReportSchema.parse(testReports.validReport)).toEqual(testReports.validReport);
    });
  
    it('safeParse() succeeds for a valid report', () => {
      const result = ReviewReportSchema.safeParse(testReports.validReport);
      expect(result.success).toBe(true);
    });

    it('parses the Octocat Hello-World report fixture', () => {
      expect(ReviewReportSchema.parse(testReports.validReport)).toEqual(testReports.validReport);
    });
  })


  describe('invalid schema inputs', () => {
    it('parse() throws for an invalid report, number parsed as a string', () => {
        expect(() => ReviewReportSchema.parse(testReports.invalidReport_stringNumber)).toThrow();
      });
      
    it('parse() throws for an invalid report, severity not in the allowed set', () => {
      expect(() => ReviewReportSchema.parse(testReports.invalidReport_wrongSeverity)).toThrow();
    });
  });


  describe('edge cases', () => {
    it('parse() throws for an missing optional metadata', () => {
      expect(() => 
        ReviewReportSchema.parse(testReports.invalidReport_missingMetadata)
      ).toThrow();
    });

    it('parse() throws for an missing required summary', () => {
      expect(() => 
        ReviewReportSchema.parse(testReports.invalidReport_missingSummary)
      ).toThrow();
    });

    it('parse() fails for out of bounds score', () => {
      const result = ReviewReportSchema.safeParse(testReports.invalidReport_outOfBoundsScore);
      expect(result.success).toBe(false);
    });
  });


  describe('JSON Schema export (zodToJsonSchema)', () => {
    const schema = ReviewReportJSONSchema as any;

    it('produces a valid JSON schema', () => {
      expect(schema.type).toBe('object');
      expect(typeof schema.properties).toBe('object');
      expect(Array.isArray(schema.required)).toBe(true);
      expect(schema.additionalProperties).toBe(false);
      expect(schema.$schema).toContain('json-schema.org');
    });

    it('is serializable to JSON without loss', () => {
      expect(JSON.parse(JSON.stringify(schema))).toEqual(schema);
    });

    it('marks all top-level properties as required', () => {
      expect(Object.keys(schema.properties).sort()).toEqual(
        ['fileReviews', 'metadata', 'pullRequest', 'recommendations', 'summary']
      );
      expect([...schema.required].sort()).toEqual(Object.keys(schema.properties).sort());
    });

    it('marks nested properties as required', () => {
      expect([...schema.properties.pullRequest.required].sort()).toEqual(['number', 'owner', 'repo']);
      expect([...schema.properties.summary.required].sort()).toEqual([
        'criticalIssues',
        'highPriorityTests',
        'overallScore',
        'refactoringOpportunities',
        'totalFiles'
      ]);
      expect([...schema.properties.metadata.required].sort()).toEqual(['agentVersions', 'analyzedAt', 'duration']);
      expect([...schema.properties.recommendations.items.required].sort()).toEqual([
        'category',
        'description',
        'files',
        'priority'
      ]);
    });

    it('exports enums and numeric bounds', () => {
      expect(schema.properties.recommendations.items.properties.priority.enum).toEqual([
        'critical',
        'high',
        'medium',
        'low'
      ]);
      const quality = schema.properties.fileReviews.items.properties.codeQuality.properties.overallScore;
      expect(quality).toMatchObject({ type: 'number', minimum: 0, maximum: 100 });
    });

    it('requires every key present in a valid report', () => {
      for (const key of schema.required) {
        expect(testReports.validReport).toHaveProperty(key);
      }
    });
  });
});
