//! Allocation-free time-based gaze smoothing with an explicit invalid state.
//! The C ABI passes state by value; callers do not share ownership or pointers.
#[repr(C)]
#[derive(Clone, Copy, Debug, Default)]
pub struct FilterState {
    pub x: f64,
    pub y: f64,
    pub timestamp_ms: f64,
    pub valid: u32,
}

#[no_mangle]
pub extern "C" fn zekals_filter_step(
    previous: FilterState,
    x: f64,
    y: f64,
    timestamp_ms: f64,
    tau_ms: f64,
    valid: u32,
) -> FilterState {
    if valid == 0
        || !x.is_finite()
        || !y.is_finite()
        || !timestamp_ms.is_finite()
        || !tau_ms.is_finite()
        || tau_ms <= 0.0
        || !(0.0..=1.0).contains(&x)
        || !(0.0..=1.0).contains(&y)
    {
        return FilterState::default();
    }
    let elapsed = timestamp_ms - previous.timestamp_ms;
    let alpha = if previous.valid == 0
        || !previous.x.is_finite()
        || !previous.y.is_finite()
        || !previous.timestamp_ms.is_finite()
        || elapsed <= 0.0
        || elapsed > 500.0
    {
        1.0
    } else {
        elapsed / (tau_ms + elapsed)
    };
    if alpha == 1.0 {
        return FilterState {
            x,
            y,
            timestamp_ms,
            valid: 1,
        };
    }
    FilterState {
        x: previous.x + alpha * (x - previous.x),
        y: previous.y + alpha * (y - previous.y),
        timestamp_ms,
        valid: 1,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn loss_resets_and_reacquisition_does_not_drift_from_old_gaze() {
        let first = zekals_filter_step(FilterState::default(), 0.2, 0.4, 10.0, 70.0, 1);
        let lost = zekals_filter_step(first, f64::NAN, 0.0, 20.0, 70.0, 1);
        assert_eq!(lost.valid, 0);
        let acquired = zekals_filter_step(lost, 0.9, 0.8, 30.0, 70.0, 1);
        assert_eq!((acquired.x, acquired.y), (0.9, 0.8));
    }
    #[test]
    fn time_based_smoothing_and_stale_input() {
        let first = zekals_filter_step(FilterState::default(), 0.0, 0.0, 0.0, 100.0, 1);
        let next = zekals_filter_step(first, 1.0, 1.0, 100.0, 100.0, 1);
        assert_eq!(next.x, 0.5);
        assert_eq!(zekals_filter_step(next, 1.0, 1.0, 1000.0, 100.0, 1).x, 1.0);
    }
    #[test]
    fn corrupted_previous_state_recovers_without_nonfinite_output() {
        let previous = FilterState {
            x: f64::NAN,
            y: f64::INFINITY,
            timestamp_ms: f64::NAN,
            valid: 1,
        };
        let next = zekals_filter_step(previous, 0.2, 0.8, 10.0, 70.0, 1);
        assert_eq!((next.x, next.y, next.valid), (0.2, 0.8, 1));
    }

    #[test]
    fn rejects_invalid_configuration_and_out_of_bounds_input() {
        for x in [f64::NAN, f64::INFINITY, -0.1, 1.1] {
            assert_eq!(
                zekals_filter_step(FilterState::default(), x, 0.5, 1.0, 70.0, 1).valid,
                0
            );
        }
        assert_eq!(
            zekals_filter_step(FilterState::default(), 0.5, 0.5, 1.0, 0.0, 1).valid,
            0
        );
    }
}
