#ifndef ZEKALS_GAZE_H
#define ZEKALS_GAZE_H
#include <stdint.h>
#ifdef __cplusplus
extern "C" {
#endif
typedef struct { double x, y, timestamp_ms; uint32_t valid; } ZekalsFilterState;
ZekalsFilterState zekals_filter_step(ZekalsFilterState previous, double x, double y,
                                    double timestamp_ms, double tau_ms, uint32_t valid);
#ifdef __cplusplus
}
#endif
#endif
