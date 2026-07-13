import React, { useState, useCallback, useEffect } from 'react';
import './ColumnMapper.css';

/**
 * ColumnMapper — embedded mapping step of the pipeline page.
 *
 * It does NOT own the file upload (the pipeline page does); it reads columns
 * from the already-chosen `queryFile`, auto-maps them against the backend
 * config, lets the user override unmapped columns, and reports the resulting
 * mapping + readiness up to the pipeline page via `onMappingChange`.
 */

const ColumnMapper = ({ backendConfig = {}, queryFile = null, onMappingChange = () => {} }) => {
  const [availableColumns, setAvailableColumns] = useState([]);
  const [autoMappedColumns, setAutoMappedColumns] = useState({}); // { backendMetric: csvColumn }
  const [unmappedColumns, setUnmappedColumns] = useState([]); // CSV columns not auto-mapped
  const [manualMappings, setManualMappings] = useState({}); // User manual mappings
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [fileDataPreview, setFileDataPreview] = useState([]);

  /**
   * Auto-map columns using EXACT MATCH (case-insensitive) against backend config.
   * Each config value may be a single alias (string) or a list of accepted
   * aliases (array of strings); a CSV column matches if it equals ANY alias.
   */
  const performAutoMapping = useCallback((csvColumns, configMetrics) => {
    const mapped = {};
    const unmapped = [];

    const normalize = (s) => String(s).toLowerCase().trim();
    const aliasesOf = (value) => (Array.isArray(value) ? value : [value]);

    csvColumns.forEach(csvCol => {
      const target = normalize(csvCol);
      const originalMetric = Object.keys(configMetrics).find(key =>
        aliasesOf(configMetrics[key]).some(alias => normalize(alias) === target)
      );

      if (originalMetric) {
        mapped[originalMetric] = csvCol;
      } else {
        unmapped.push(csvCol);
      }
    });

    return { mapped, unmapped };
  }, []);

  /**
   * Read a file's columns + preview and (re)build the auto-mapping.
   * Used both for a fresh upload and for a file already chosen on the Dashboard.
   */
  const processFile = useCallback(async (file) => {
    setIsLoading(true);
    setError(null);

    try {
      const columns = await extractColumnsFromFile(file);
      setAvailableColumns(columns);

      // Perform auto-mapping
      const { mapped, unmapped } = performAutoMapping(columns, backendConfig);
      setAutoMappedColumns(mapped);
      setUnmappedColumns(unmapped);
      setManualMappings({}); // Reset manual mappings

      // Get preview data
      const preview = await getFilePreview(file);
      if (preview && Array.isArray(preview)) {
        setFileDataPreview(preview);
      }
    } catch (err) {
      setError(`Error processing file: ${err.message}`);
      console.error('File processing error:', err);
    } finally {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [backendConfig, performAutoMapping]);

  // Process whatever file the pipeline page has chosen — on mount and whenever
  // that shared file changes.
  useEffect(() => {
    if (queryFile) processFile(queryFile);
  }, [queryFile, processFile]);

  /**
   * Extract columns from CSV or Excel file
   */
  const extractColumnsFromFile = async (file) => {
    const extension = file.name.split('.').pop().toLowerCase();

    if (extension === 'csv') {
      return await extractColumnsFromCSV(file);
    } else if (['xlsx', 'xls'].includes(extension)) {
      return await extractColumnsFromExcel(file);
    } else {
      throw new Error('Unsupported file format. Please upload CSV or Excel file.');
    }
  };

  /**
   * Extract columns from CSV file
   */
  const extractColumnsFromCSV = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const text = e.target.result;
          const lines = text.split('\n');
          const headers = lines[0].split(',').map(h => h.trim());
          resolve(headers.filter(h => h.length > 0));
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  };

  /**
   * Extract columns from Excel file
   */
  const extractColumnsFromExcel = async (file) => {
    try {
      const { read, utils } = await import('xlsx');
      const buffer = await file.arrayBuffer();
      const workbook = read(buffer);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const data = utils.sheet_to_json(worksheet);

      if (data.length === 0) {
        throw new Error('Excel file is empty');
      }

      return Object.keys(data[0]);
    } catch (err) {
      throw new Error(`Failed to read Excel file: ${err.message}`);
    }
  };

  /**
   * Get preview of file data (first 3 rows)
   */
  const getFilePreview = async (file) => {
    const extension = file.name.split('.').pop().toLowerCase();

    if (extension === 'csv') {
      return await getCSVPreview(file);
    } else if (['xlsx', 'xls'].includes(extension)) {
      return await getExcelPreview(file);
    }
    return [];
  };

  const getCSVPreview = (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const text = e.target.result;
          const lines = text.split('\n').slice(0, 4);
          resolve(lines);
        } catch {
          resolve([]);
        }
      };
      reader.readAsText(file);
    });
  };

  const getExcelPreview = async (file) => {
    try {
      const { read, utils } = await import('xlsx');
      const buffer = await file.arrayBuffer();
      const workbook = read(buffer);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const data = utils.sheet_to_json(worksheet);
      return data.slice(0, 3);
    } catch {
      return [];
    }
  };

  /**
   * Handle manual mapping for unmapped columns
   */
  const handleManualMapping = (csvColumn, backendMetric) => {
    if (backendMetric === '') {
      // Remove mapping if empty selected
      setManualMappings(prev => {
        const updated = { ...prev };
        delete updated[csvColumn];
        return updated;
      });
    } else {
      setManualMappings(prev => ({
        ...prev,
        [csvColumn]: backendMetric
      }));
    }
  };

  /**
   * Combine auto-mapped and manual mappings into the backend format
   * ({ csvColumn: backendMetric }).
   */
  const buildFinalMapping = useCallback(() => {
    const finalMapping = {};

    // Auto-mapped is stored as { backendMetric: csvColumn } — reverse it.
    Object.entries(autoMappedColumns).forEach(([csvColumn, backendMetric]) => {
      finalMapping[csvColumn] = backendMetric;
    });

    // Manual mappings are stored as { csvColumn: backendMetric }.
    Object.entries(manualMappings).forEach(([backendMetric, csvColumn]) => {
      finalMapping[csvColumn] = backendMetric;
    });

    return finalMapping;
  }, [autoMappedColumns, manualMappings]);

  const hasAutoMappings = Object.keys(autoMappedColumns).length > 0;
  const allMapped = unmappedColumns.length === 0 ||
    unmappedColumns.every(col => manualMappings[col]);

  // Report the mapping + readiness up to the pipeline page whenever it changes.
  // Ready requires at least one column to be mapped — prevents sending an empty
  // mapping that would silently produce a zero-row output.
  useEffect(() => {
    const finalMapping = buildFinalMapping();
    onMappingChange({
      mapping: [finalMapping],
      ready: availableColumns.length > 0 && Object.keys(finalMapping).length > 0,
    });
  }, [buildFinalMapping, availableColumns.length, onMappingChange]);

  return (
    <div className="column-mapper">
      <h2>🗂️ Column Mapping</h2>
      <p className="mapper-subtitle">
        We auto-matched your file's columns to our metrics. Review them and map any leftovers below.
      </p>

      {isLoading && <div className="mapper-section">Reading columns…</div>}

      {/* Error Messages */}
      {error && (
        <div className="error-message">
          ⚠️ {error}
        </div>
      )}

      {/* File Preview */}
      {fileDataPreview.length > 0 && (
        <div className="mapper-section">
          <h3>File Preview</h3>
          <div className="preview-container">
            <table className="preview-table">
              <thead>
                <tr>
                  {/* CSV previews are raw strings; Excel previews are row objects */}
                  {(typeof fileDataPreview[0] === 'string'
                    ? fileDataPreview[0].split(',')
                    : Object.keys(fileDataPreview[0] || {})
                  ).map(col => (
                    <th key={col}>{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {fileDataPreview.slice(1).map((row, idx) => (
                  <tr key={idx}>
                    {(typeof row === 'string'
                      ? row.split(',')
                      : Object.values(row)
                    ).map((cell, cellIdx) => (
                      <td key={cellIdx}>{String(cell || '').trim()}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Auto-Mapped Columns — collapsed by default (informational). */}
      {hasAutoMappings && (
        <details className="mapper-section mapper-collapse auto-mapped-section">
          <summary className="mapper-collapse-head">
            <span>✅ Auto-Mapped Columns ({Object.keys(autoMappedColumns).length})</span>
            <span className="mapper-collapse-chevron" aria-hidden="true">▸</span>
          </summary>
          <div className="mapper-collapse-body">
            <p className="instruction">These columns were automatically matched to your data</p>
            <div className="auto-mapped-grid">
              {Object.entries(autoMappedColumns).map(([backendMetric, csvColumn]) => (
                <div key={backendMetric} className="auto-mapped-item">
                  <div className="auto-mapped-left">
                    <span className="csv-column">{csvColumn}</span>
                    <span className="arrow">→</span>
                    <span className="backend-metric">{backendMetric}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </details>
      )}

      {/* Manual Mapping for Unmapped Columns — open by default (needs action). */}
      {unmappedColumns.length > 0 && (
        <details className="mapper-section mapper-collapse manual-mapping-section" open>
          <summary className="mapper-collapse-head">
            <span>⚠️ Unmapped Columns ({unmappedColumns.length})</span>
            <span className="mapper-collapse-chevron" aria-hidden="true">▸</span>
          </summary>
          <div className="mapper-collapse-body">
            <p className="instruction">Optionally map any of these to a metric — leftover columns are ignored.</p>
            <div className="manual-mapping-grid">
              {unmappedColumns.map(csvColumn => (
                <div key={csvColumn} className="manual-mapping-row">
                  <label className="csv-column-label">{csvColumn}</label>
                  <select
                    value={manualMappings[csvColumn] || ''}
                    onChange={(e) => handleManualMapping(csvColumn, e.target.value)}
                    className={`column-select ${manualMappings[csvColumn] ? 'mapped' : 'unmapped'
                      }`}
                  >
                    <option value="">-- Select Metric --</option>
                    {Object.keys(backendConfig).map(metric => (
                      <option key={metric} value={metric}>
                        {metric}
                      </option>
                    ))}
                    <option value="skip" disabled>
                      -- Skip Column --
                    </option>
                  </select>
                </div>
              ))}
            </div>
          </div>
        </details>
      )}

      {/* Success Message */}
      {availableColumns.length > 0 && allMapped && (
        <div className="success-message">
          ✨ All columns mapped! Run the pipeline below.
        </div>
      )}
    </div>
  );
};

export default ColumnMapper;
