# services/formatter.py — Stage 1: Reformat raw query CSV into Excel

import pandas as pd

# from core.config import COLUMN_MAPPING, EXTRA_COLUMNS


def run_format(query_path: str, out_path: str, dynamic_mapping: dict) -> None:
    """
    Args:
        dynamic_mapping: A dict like {"ROA": "ROA_Column_From_CSV", "ROE": "ROE_Column"}
    """
    df_source = pd.read_csv(query_path)
    df_output = pd.DataFrame()

    # Use the mapping provided by the user/frontend instead of core.config
    for output_col, source_col in dynamic_mapping.items():
        if source_col in df_source.columns:
            df_output[output_col] = df_source[source_col]
        else:
            df_output[output_col] = None

    df_output.to_excel(out_path, index=False)
